"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Center,
  ContactShadows,
  Environment,
  Float,
  OrbitControls,
  useTexture,
} from "@react-three/drei";
import { EffectComposer, Bloom, N8AO, SMAA } from "@react-three/postprocessing";
import { MATERIALS, fontOptions } from "@/lib/options";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  useTTFFont,
  buildSolidLetterGeometry,
  MATERIAL_GROUP,
} from "@/components/three/letterGeometry";
import type { SignType, LightModeId, MaterialOption } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// TUNABLE CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ENV_HDR_PATH        = "/hdri/studio.hdr";
const ENV_INTENSITY       = 1.2;   // day — neutral studio HDRI
const ENV_INTENSITY_NIGHT = 0.4;   // night — dim ambient so emissives pop
const TONEMAP_EXPOSURE    = 1.1;

// PBR texture tiling (tiles per letter face) — asset folder names kept as-is,
// only the material catalog ids ("kompozit" / "3dtlac") changed.
const KOMPOZIT_REPEAT = 2;   // metal_plate — 2× gives realistic scale
const THREED_REPEAT   = 8;   // ribbed_corduroy — 8× simulates fine FDM layer lines

// Bloom — the ONLY light source is material emissive; no scene point-lights
// drive it. Threshold tuned so only emissive faces bloom.
const BLOOM_LUMINANCE_THRESHOLD = 0.85;
const BLOOM_LUMINANCE_SMOOTHING = 0.4;
const BLOOM_RADIUS              = 0.75;
const BLOOM_INTENSITY_BASE      = 0.9;   // front / full / outline / sides
const BLOOM_INTENSITY_HALO      = 1.6;   // halo / combined — "silnejší bloom"
const AO_INTENSITY              = 1.4;

// Depth (mm) → world-unit scale. One shared range for every material AND
// every font now — see lib/options.ts MIN_DEPTH_MM/MAX_DEPTH_MM. At
// MAX_DEPTH_MM=200 this divisor puts the thickest letters at ~1.4× the
// glyph size (0.78) — the first constant to re-tune if that reads as too
// chunky or too thin.
const DEPTH_SCALE_DIVISOR = 140;
const MIN_DEPTH_UNITS     = 0.05; // crash-safety floor only, not a visual design choice

const TEXT_DEBOUNCE_MS = 300; // only text/thickness are debounced — font switches are discrete clicks, not rapid-fire

// Auto-rotation
const AUTO_ROTATE_SPEED       = 0.12; // rad/s — slow, continuous
const ROTATION_REPORT_INTERVAL = 0.2;  // s — how often the live angle is reported back to the slider

// Emissive scale per light mode, per face group (front cap / side wall / back cap).
// "halo" has no wall to project onto — the back cap's own emission plus a
// stronger bloom pass is what reads as a glow around the letter in the air.
// "sides" and "outline" both drive the side-wall group — sides reads as a
// broader lateral glow (a touch of front/back bleed), outline as a crisp
// contour (side-only, front/back near zero).
const FACE_EMISSIVE: Record<LightModeId, { front: number; side: number; back: number }> = {
  front:    { front: 1.00, side: 0.06, back: 0.04 },
  halo:     { front: 0.05, side: 0.20, back: 0.95 },
  sides:    { front: 0.08, side: 1.00, back: 0.08 },
  outline:  { front: 0.05, side: 0.95, back: 0.05 },
  full:     { front: 1.00, side: 1.00, back: 1.00 },
  combined: { front: 0.85, side: 0.20, back: 0.55 },
};
const EMISSIVE_BASE_INTENSITY   = 3.2;
const EMISSIVE_NIGHT_MULTIPLIER = 1.8;

// How far a transmissive material's (plexi) body colour is pulled toward
// white when illuminated (0 = full bodyColor, 1 = old fully-white behaviour).
const WHITE_BASE_BLEND = 0.45;

// ─────────────────────────────────────────────────────────────────────────────

type LightSettings = {
  emissiveFront: number;
  emissiveSide:  number;
  emissiveBack:  number;
};

function getLightingSettings(
  signType: SignType,
  lightMode: LightModeId,
  night: boolean,
): LightSettings {
  if (signType === "plain") {
    return { emissiveFront: 0, emissiveSide: 0, emissiveBack: 0 };
  }
  const base = FACE_EMISSIVE[lightMode];
  const n    = (night ? EMISSIVE_NIGHT_MULTIPLIER : 1) * EMISSIVE_BASE_INTENSITY;
  return {
    emissiveFront: base.front * n,
    emissiveSide:  base.side  * n,
    emissiveBack:  base.back  * n,
  };
}

function safeColor(v: string): string {
  return !v || v.includes("gradient") ? "#00c8ff" : v;
}

// Data-driven PBR material builder — all tweakable values live in MaterialOption.pbr.
// Used for all three face groups: front/back caps use isSide=false (same
// physical face material, just different emissive), the cut side wall uses
// isSide=true (matOpt's side roughness/transmission multipliers).
function buildPhysicalMat(
  matOpt: MaterialOption,
  color: THREE.Color,
  emissive: THREE.Color,
  emissiveIntensity: number,
  isSide: boolean,
  isIlluminated: boolean,
): THREE.MeshPhysicalMaterial {
  const p = matOpt.pbr;

  const roughness    = p.roughness * (isSide ? (p.sideRoughnessMul ?? 1) : 1);
  const emissiveScale = isSide ? (p.emissiveSideScale ?? 1) : (p.emissiveFrontScale ?? 1);
  const scaledEmissive = emissiveIntensity * emissiveScale;

  // useWhiteBase: transmissive materials (plexi) read as clear glass when lit,
  // so the body colour is only partially blended toward white (not fully
  // overridden) — a dark bodyColor still stays legible as a tinted acrylic
  // instead of washing out to a pale, hard-to-see near-white on load.
  // In plain mode the chosen colour is shown at full strength.
  const baseColor = (p.useWhiteBase && isIlluminated)
    ? color.clone().lerp(new THREE.Color(0xffffff), WHITE_BASE_BLEND)
    : color;

  const params: THREE.MeshPhysicalMaterialParameters = {
    color:              baseColor,
    emissive,
    emissiveIntensity:  scaledEmissive,
    roughness,
    metalness:          p.metalness ?? 0,
    anisotropy:         isSide ? 0 : (p.anisotropy ?? 0),
    clearcoat:          isSide ? 0 : (p.clearcoat ?? 0),
    clearcoatRoughness: p.clearcoatRoughness ?? 0,
  };

  if (p.transmission !== undefined) {
    params.transmission = p.transmission * (isSide ? (p.sideTransmissionMul ?? 1) : 1);
    params.ior          = p.ior ?? 1.5;
    params.thickness    = p.thickness ?? 0.3;
    params.transparent  = true;
  }

  return new THREE.MeshPhysicalMaterial(params);
}

type MaterialTriple = {
  sideMat:  THREE.MeshPhysicalMaterial;
  backMat:  THREE.MeshPhysicalMaterial;
  frontMat: THREE.MeshPhysicalMaterial;
};

function buildMaterialTriple(
  matOpt: MaterialOption,
  baseColor: THREE.Color,
  glowColor: THREE.Color,
  ls: LightSettings,
  isIlluminated: boolean,
): MaterialTriple {
  return {
    sideMat:  buildPhysicalMat(matOpt, baseColor.clone(), glowColor.clone(), ls.emissiveSide,  true,  isIlluminated),
    backMat:  buildPhysicalMat(matOpt, baseColor.clone(), glowColor.clone(), ls.emissiveBack,  false, isIlluminated),
    frontMat: buildPhysicalMat(matOpt, baseColor.clone(), glowColor.clone(), ls.emissiveFront, false, isIlluminated),
  };
}

// material array index order must match MATERIAL_GROUP
function toMaterialArray(t: MaterialTriple): THREE.MeshPhysicalMaterial[] {
  const arr: THREE.MeshPhysicalMaterial[] = [];
  arr[MATERIAL_GROUP.SIDE]  = t.sideMat;
  arr[MATERIAL_GROUP.BACK]  = t.backMat;
  arr[MATERIAL_GROUP.FRONT] = t.frontMat;
  return arr;
}

function disposeMaterialTriple(t: MaterialTriple) {
  t.sideMat.dispose();
  t.backMat.dispose();
  t.frontMat.dispose();
}

// ── PBR texture support ───────────────────────────────────────────────────────

type TexSet = {
  map:           THREE.Texture;
  roughnessMap:  THREE.Texture;
  normalMap?:    THREE.Texture;
  metalnessMap?: THREE.Texture;
};

function configTex(
  tex:        THREE.Texture,
  colorSpace: THREE.ColorSpace,
  repeat:     number,
  aniso:      number,
) {
  tex.colorSpace = colorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
}

function applyTexToMat(mat: THREE.MeshPhysicalMaterial, texSet: TexSet) {
  mat.map = texSet.map;
  mat.roughnessMap = texSet.roughnessMap;
  if (texSet.normalMap)    mat.normalMap    = texSet.normalMap;
  if (texSet.metalnessMap) mat.metalnessMap = texSet.metalnessMap;
  mat.needsUpdate = true;
}

function useTexturedTriple(
  matOpt:        MaterialOption,
  baseColor:     THREE.Color,
  glowColor:     THREE.Color,
  ls:            LightSettings,
  isIlluminated: boolean,
  texSet:        TexSet,
  repeat:        number,
): MaterialTriple {
  const { gl } = useThree();
  const { map, roughnessMap, normalMap, metalnessMap } = texSet;

  useLayoutEffect(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    configTex(map,          THREE.SRGBColorSpace,       repeat, maxAniso);
    configTex(roughnessMap, THREE.LinearSRGBColorSpace, repeat, maxAniso);
    if (normalMap)    configTex(normalMap,    THREE.LinearSRGBColorSpace, repeat, maxAniso);
    if (metalnessMap) configTex(metalnessMap, THREE.LinearSRGBColorSpace, repeat, maxAniso);
  }, [gl, map, roughnessMap, normalMap, metalnessMap, repeat]);

  const triple = useMemo(() => {
    const t = buildMaterialTriple(matOpt, baseColor, glowColor, ls, isIlluminated);
    applyTexToMat(t.sideMat, texSet);
    applyTexToMat(t.backMat, texSet);
    applyTexToMat(t.frontMat, texSet);
    return t;
  }, [matOpt, baseColor, glowColor, ls, isIlluminated, map, roughnessMap, normalMap, metalnessMap]);

  useEffect(() => () => disposeMaterialTriple(triple), [triple]);

  return triple;
}

// ── Solid letter mesh ─────────────────────────────────────────────────────────

type SolidLetterMeshProps = {
  geometry: THREE.BufferGeometry;
  materials: THREE.MeshPhysicalMaterial[];
};

function SolidLetterMesh({ geometry, materials }: SolidLetterMeshProps) {
  return <mesh geometry={geometry} material={materials} />;
}

type TexLetterProps = {
  matOpt:        MaterialOption;
  baseColor:     THREE.Color;
  glowColor:     THREE.Color;
  ls:            LightSettings;
  isIlluminated: boolean;
  geometry:      THREE.BufferGeometry;
};

function KompozitLetters({ matOpt, baseColor, glowColor, ls, isIlluminated, geometry }: TexLetterProps) {
  const [colorMap, roughMap, normalMap, metalMap] = useTexture([
    "/textures/alubond/color.jpg",
    "/textures/alubond/roughness.jpg",
    "/textures/alubond/normal.jpg",
    "/textures/alubond/metalness.jpg",
  ]);
  const triple = useTexturedTriple(
    matOpt, baseColor, glowColor, ls, isIlluminated,
    { map: colorMap, roughnessMap: roughMap, normalMap, metalnessMap: metalMap },
    KOMPOZIT_REPEAT,
  );
  return <SolidLetterMesh geometry={geometry} materials={toMaterialArray(triple)} />;
}

function ThreeDLetters({ matOpt, baseColor, glowColor, ls, isIlluminated, geometry }: TexLetterProps) {
  const [colorMap, roughMap, normalMap] = useTexture([
    "/textures/3dtlac/color.jpg",
    "/textures/3dtlac/roughness.jpg",
    "/textures/3dtlac/normal.jpg",
  ]);
  const triple = useTexturedTriple(
    matOpt, baseColor, glowColor, ls, isIlluminated,
    { map: colorMap, roughnessMap: roughMap, normalMap },
    THREED_REPEAT,
  );
  return <SolidLetterMesh geometry={geometry} materials={toMaterialArray(triple)} />;
}

type LetterVariantProps = TexLetterProps & {
  material: string;
  fallback: THREE.MeshPhysicalMaterial[];
};

function LetterVariant({ material, fallback, geometry, ...rest }: LetterVariantProps) {
  const fallbackMesh = <SolidLetterMesh geometry={geometry} materials={fallback} />;

  if (material === "kompozit") {
    return <Suspense fallback={fallbackMesh}><KompozitLetters geometry={geometry} {...rest} /></Suspense>;
  }
  if (material === "3dtlac") {
    return <Suspense fallback={fallbackMesh}><ThreeDLetters geometry={geometry} {...rest} /></Suspense>;
  }
  return fallbackMesh;
}

// ── TTF geometry host ─────────────────────────────────────────────────────────
// Suspends on the TTF fetch for `fontFile` (cached after first use — see
// letterGeometry.ts), then builds the solid extrusion. Kept in its own
// Suspense boundary (see SceneContent) so switching fonts only hides the
// letters themselves, never the rest of the scene (lights/HDRI/controls).

type LetterGeometryHostProps = {
  fontFile: string;
  text: string;
  depth: number;
  material: string;
  matOpt: MaterialOption;
  baseColor: THREE.Color;
  glowColor: THREE.Color;
  ls: LightSettings;
  isIlluminated: boolean;
  fallbackTriple: MaterialTriple;
  onFailedGlyphs?: (count: number) => void;
};

function LetterGeometryHost({
  fontFile, text, depth, material, matOpt, baseColor, glowColor, ls, isIlluminated,
  fallbackTriple, onFailedGlyphs,
}: LetterGeometryHostProps) {
  const font = useTTFFont(fontFile);

  const build = useMemo(
    () => buildSolidLetterGeometry(font, text, depth),
    [font, text, depth],
  );

  useEffect(() => {
    if (build.failedCount > 0) onFailedGlyphs?.(build.failedCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [build]);

  useEffect(() => {
    return () => build.geometry?.dispose();
  }, [build]);

  if (!build.geometry) return null; // every glyph in the string failed to extrude

  return (
    <LetterVariant
      material={material}
      fallback={toMaterialArray(fallbackTriple)}
      matOpt={matOpt}
      baseColor={baseColor}
      glowColor={glowColor}
      ls={ls}
      isIlluminated={isIlluminated}
      geometry={build.geometry}
    />
  );
}

// Forces a render when frameloop="demand" (reducedMotion) and relevant state changes.
function InvalidateOnChange({ deps }: { deps: React.DependencyList }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return null;
}

// Owns the letter group's Y rotation. While autoRotate is on it spins
// continuously via useFrame (imperative ref mutation — no React re-render per
// frame) and periodically reports the live angle back so the slider doesn't
// go stale. While off, it's fully controlled by the `rotation` prop (degrees).
function RotatingGroup({
  rotation,
  autoRotate,
  onRotationChange,
  children,
}: {
  rotation: number;
  autoRotate: boolean;
  onRotationChange?: (deg: number) => void;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const initialized = useRef(false);

  // Stable refs — the useFrame callback closes over these instead of the
  // raw props, so its identity never has to change across renders.
  const rotationRef = useRef(rotation);
  const autoRotateRef = useRef(autoRotate);
  const onRotationChangeRef = useRef(onRotationChange);
  rotationRef.current = rotation;
  autoRotateRef.current = autoRotate;
  onRotationChangeRef.current = onRotationChange;

  useLayoutEffect(() => {
    if (groupRef.current && !initialized.current) {
      groupRef.current.rotation.y = THREE.MathUtils.degToRad(rotation);
      initialized.current = true;
    }
  }, [rotation]);

  const frameCallback = useCallback((_: unknown, delta: number) => {
    const g = groupRef.current;
    if (!g) return;
    if (autoRotateRef.current) {
      g.rotation.y += AUTO_ROTATE_SPEED * delta;
    } else {
      g.rotation.y = THREE.MathUtils.degToRad(rotationRef.current);
    }
  }, []);

  useFrame(frameCallback);

  // Reporting the live angle back to the slider is deliberately NOT driven by
  // useFrame — R3F's frame-loop subscription churned (re-subscribing) under
  // Suspense-driven re-renders of sibling content, which produced bursts of
  // setState calls far above the intended throttle and tripped React's
  // "Maximum update depth exceeded". A plain setInterval, set up once via a
  // mount-only effect and read through refs, has ordinary React cleanup
  // guarantees and is immune to that class of bug.
  useEffect(() => {
    const id = setInterval(() => {
      const g = groupRef.current;
      if (!g || !autoRotateRef.current) return;
      onRotationChangeRef.current?.(THREE.MathUtils.radToDeg(g.rotation.y) % 360);
    }, ROTATION_REPORT_INTERVAL * 1000);
    return () => clearInterval(id);
  }, []);

  return <group ref={groupRef}>{children}</group>;
}

// ── Component types ───────────────────────────────────────────────────────────

type LetterSceneProps = {
  text: string;
  font: string;
  lightColor: string;
  letterColor: string;
  thickness: number;
  material: string;       // MaterialOption.id
  signType: SignType;
  lightMode: LightModeId;
  height: number;
  rotation: number;               // manual group Y rotation, degrees — used when autoRotate is off
  autoRotate?: boolean;           // default true
  onRotationChange?: (deg: number) => void; // reports live angle while auto-rotating
  previewMode: "day" | "night";
  reducedMotion?: boolean;
  onFailedGlyphs?: (count: number) => void;
};

// ── Main export ───────────────────────────────────────────────────────────────

export default function LetterScene(props: LetterSceneProps) {
  const { signType, lightMode, reducedMotion = false } = props;
  const bloomActive = signType === "illuminated";
  const bloomIntensity = bloomActive
    ? ((lightMode === "halo" || lightMode === "combined") ? BLOOM_INTENSITY_HALO : BLOOM_INTENSITY_BASE)
    : 0;

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0.8, 7.5], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        frameloop={reducedMotion ? "demand" : "always"}
        onCreated={({ gl }) => {
          gl.toneMapping         = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = TONEMAP_EXPOSURE;
          gl.outputColorSpace    = THREE.SRGBColorSpace;
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>

        <EffectComposer frameBufferType={THREE.HalfFloatType}>
          <N8AO aoRadius={0.35} intensity={AO_INTENSITY} quality="medium" />
          <Bloom
            mipmapBlur
            luminanceThreshold={bloomActive ? BLOOM_LUMINANCE_THRESHOLD : 10}
            luminanceSmoothing={BLOOM_LUMINANCE_SMOOTHING}
            intensity={bloomIntensity}
            radius={BLOOM_RADIUS}
          />
          <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

// ── Scene content ─────────────────────────────────────────────────────────────

function SceneContent({
  text,
  font,
  lightColor,
  letterColor,
  thickness,
  material,
  signType,
  lightMode,
  height,
  rotation,
  autoRotate = true,
  onRotationChange,
  previewMode,
  reducedMotion = false,
  onFailedGlyphs,
}: LetterSceneProps) {
  const safeText  = text?.trim() || "VÁŠ TEXT";
  const isNight   = previewMode === "night";
  const isIlluminated = signType === "illuminated";

  const fontOpt = useMemo(
    () => fontOptions.find((f) => f.id === font) ?? fontOptions[0],
    [font],
  );
  // Script/cursive faces are designed for mixed case — forcing UPPERCASE on
  // them breaks letter connections and looks wrong. Every other category
  // matches the site's own bold-uppercase voice.
  const displayText = fontOpt.category === "script" ? safeText : safeText.toUpperCase();

  const glowColor = useMemo(() => new THREE.Color(safeColor(lightColor)), [lightColor]);
  const baseColor = useMemo(() => new THREE.Color(safeColor(letterColor)), [letterColor]);

  const ls = getLightingSettings(signType, lightMode, isNight);

  const heightScale = Math.min(1.15, Math.max(0.78, height / 45));
  const lenScale    = Math.min(1, 6.5 / Math.max(safeText.length, 6));
  const finalScale  = heightScale * lenScale;
  const effectiveAutoRotate = autoRotate && !reducedMotion;

  // Resolve MaterialOption — falls back to first material if id unknown
  const matOpt = useMemo(
    () => MATERIALS.find((m) => m.id === material) ?? MATERIALS[0],
    [material],
  );

  // ── Geometry rebuild inputs — only text/thickness are debounced. Font
  // switches are discrete clicks (not rapid-fire like typing/dragging), so
  // the TTF fetch starts the instant a font is picked instead of waiting out
  // an artificial delay.
  const debouncedText      = useDebouncedValue(displayText, TEXT_DEBOUNCE_MS);
  const debouncedThickness = useDebouncedValue(thickness, TEXT_DEBOUNCE_MS);
  const depthUnits = Math.max(MIN_DEPTH_UNITS, debouncedThickness / DEPTH_SCALE_DIVISOR);

  // Fallback (non-textured) material triple — also used directly for plexi/pvc,
  // and as the <LetterVariant> Suspense fallback while a textured material loads.
  const fallbackTriple = useMemo(
    () => buildMaterialTriple(matOpt, baseColor, glowColor, ls, isIlluminated),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [material, signType, lightColor, letterColor, ls.emissiveFront, ls.emissiveSide, ls.emissiveBack],
  );

  useEffect(() => {
    return () => disposeMaterialTriple(fallbackTriple);
  }, [fallbackTriple]);

  return (
    <>
      {/* ── Ambient + directional fill — visibility/reflections only, no light mode drives these ── */}
      <ambientLight intensity={isNight ? 0.35 : 1.4} />
      <directionalLight position={[3, 5, 4]}   intensity={isNight ? 1.0 : 2.6} castShadow />
      <directionalLight position={[-3, 2, -3]}  intensity={isNight ? 0.25 : 0.8} />

      {/* ── Sign geometry ── */}
      <Float
        speed={reducedMotion ? 0 : 1}
        rotationIntensity={reducedMotion ? 0 : 0.07}
        floatIntensity={reducedMotion ? 0 : 0.04}
      >
        <RotatingGroup rotation={rotation} autoRotate={effectiveAutoRotate} onRotationChange={onRotationChange}>
          <Center position={[0, 0.35, 0]} scale={finalScale}>
            <group rotation={[-0.08, 0, 0]}>

              {/* Own Suspense boundary — switching fonts only hides the letters
                  while their TTF loads, never the lights/HDRI/controls. */}
              <Suspense fallback={null}>
                <LetterGeometryHost
                  fontFile={fontOpt.file}
                  text={debouncedText}
                  depth={depthUnits}
                  material={material}
                  matOpt={matOpt}
                  baseColor={baseColor}
                  glowColor={glowColor}
                  ls={ls}
                  isIlluminated={isIlluminated}
                  fallbackTriple={fallbackTriple}
                  onFailedGlyphs={onFailedGlyphs}
                />
              </Suspense>

            </group>
          </Center>
        </RotatingGroup>
      </Float>

      {/* ── Image-based lighting — own Suspense so 6 MB HDRI fetch doesn't block text ── */}
      <Suspense fallback={null}>
        <Environment
          files={ENV_HDR_PATH}
          background={false}
          environmentIntensity={isNight ? ENV_INTENSITY_NIGHT : ENV_INTENSITY}
        />
      </Suspense>

      <ContactShadows position={[0, -1.35, 0]} opacity={0.3} blur={2.4} far={2.2} resolution={512} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2.5}
        maxPolarAngle={Math.PI / 2.05}
      />

      <InvalidateOnChange
        deps={[text, font, lightColor, letterColor, thickness, material, signType, lightMode, height, rotation, autoRotate, previewMode]}
      />
    </>
  );
}

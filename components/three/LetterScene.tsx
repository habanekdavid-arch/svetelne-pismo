"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { Center, Environment, OrbitControls, useTexture } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
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
const BLOOM_INTENSITY_BASE      = 0.9;   // front / full
const BLOOM_INTENSITY_HALO      = 1.6;   // halo — stronger bloom for the wall glow

// Depth (mm) → world-unit scale. One shared range for every material AND
// every font now — see lib/options.ts MIN_DEPTH_MM/MAX_DEPTH_MM. At
// MAX_DEPTH_MM=200 this divisor puts the thickest letters at ~1.4× the
// glyph size (0.78) — the first constant to re-tune if that reads as too
// chunky or too thin.
const DEPTH_SCALE_DIVISOR = 140;
const MIN_DEPTH_UNITS     = 0.05; // crash-safety floor only, not a visual design choice

const TEXT_DEBOUNCE_MS = 300; // only text/thickness are debounced — font switches are discrete clicks, not rapid-fire

// Default 3/4 view. The sign doesn't auto-rotate, but the viewer can drag
// within a limited arc (see OrbitControls in SceneContent) to look around it.
const CAMERA_POS: [number, number, number]    = [1.9, 0.78, 7.9];
const CAMERA_TARGET: [number, number, number] = [0, 0.05, 0];
const CAMERA_FOV = 30;
const ORBIT_AZIMUTH = Math.PI / 4;   // ± horizontal drag range (45°)
const VIEW_TILT = -0.04; // tiny forward pitch of the letter group (radians)

// Smooth matte "wall" the letters are mounted on — a soft vertical gradient
// plus a gentle vignette reads far better than a dead-flat fill.
const WALL_GRADIENT_DAY: [string, string, string]   = ["#fbfaf8", "#efedea", "#ddd8d2"];
const WALL_GRADIENT_NIGHT: [string, string, string] = ["#17171c", "#0d0d11", "#050506"];

// Emissive scale per light mode, per face group (front cap / side wall / back cap).
// front → lit face, halo → back face washing the wall, full → whole letter.
//
// `full` used to be a flat 1.00 across all three faces, which at the base
// intensity below blew out to a solid white slab with no letterform left in
// it. Real fully-lit channel letters are brightest on the face and softer
// round the returns, so the sides and back are pulled down and the face
// eased off — the shape stays readable instead of becoming a glare.
const FACE_EMISSIVE: Record<LightModeId, { front: number; side: number; back: number }> = {
  front: { front: 1.00, side: 0.06, back: 0.04 },
  halo:  { front: 0.04, side: 0.16, back: 1.00 },
  full:  { front: 0.62, side: 0.42, back: 0.50 },
};
const EMISSIVE_BASE_INTENSITY   = 3.2;
const EMISSIVE_NIGHT_MULTIPLIER = 1.55;

// ── Halo wall wash ──────────────────────────────────────────────────────────
// Emissive materials light nothing but themselves, and in halo mode the only
// bright face points AT the wall, away from the camera — so the mode showed a
// dim letter and a dark wall. These drive a real light parked between the sign
// and the wall, which is what actually spreads the glow across it.
// Intensity, and crucially DISTANCE FROM THE WALL. Sitting the lights almost
// against it (z + 0.12) made the pool a blown hotspot rather than a wash —
// point-light falloff goes as 1/d^decay, so at 0.12 away an intensity of 4
// lands like ~150. Backing them off toward the letters both softens the
// falloff and widens the pool, which is what a halo actually looks like.
const HALO_LIGHT_INTENSITY = 7.5;
const HALO_LIGHT_WALL_GAP        = 0.55; // how far in front of the wall they sit
const HALO_LIGHT_DISTANCE        = 12;   // falloff radius — the size of the pool
const HALO_LIGHT_DECAY           = 1.35;
// `full` also spills a little onto the wall, just far less than a halo sign.
const FULL_WASH_FACTOR = 0.3;

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
  // A plain sign never emits — and neither does an illuminated one in daylight.
  // A real sign is switched off during the day, so Deň shows the physical
  // object: the material, the body colour, the depth and the shadow it casts.
  // Noc is where the LEDs come on. This also means Deň and Noc now differ in
  // the one way a customer cares about, instead of both looking lit.
  if (signType === "plain" || !night) {
    return { emissiveFront: 0, emissiveSide: 0, emissiveBack: 0 };
  }
  const base = FACE_EMISSIVE[lightMode];
  const n    = EMISSIVE_NIGHT_MULTIPLIER * EMISSIVE_BASE_INTENSITY;
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

  // texSet arrives as a fresh object literal on every render, so depending on
  // it directly would rebuild (and dispose) all three GPU materials each frame.
  // Re-wrap it from the individual textures instead: same contents, stable
  // identity, and the dependency list now says what it actually depends on.
  const stableTexSet = useMemo(
    () => ({ map, roughnessMap, normalMap, metalnessMap }),
    [map, roughnessMap, normalMap, metalnessMap],
  );

  const triple = useMemo(() => {
    const t = buildMaterialTriple(matOpt, baseColor, glowColor, ls, isIlluminated);
    applyTexToMat(t.sideMat, stableTexSet);
    applyTexToMat(t.backMat, stableTexSet);
    applyTexToMat(t.frontMat, stableTexSet);
    return t;
  }, [matOpt, baseColor, glowColor, ls, isIlluminated, stableTexSet]);

  useEffect(() => () => disposeMaterialTriple(triple), [triple]);

  return triple;
}

// ── Solid letter mesh ─────────────────────────────────────────────────────────

type SolidLetterMeshProps = {
  geometry: THREE.BufferGeometry;
  materials: THREE.MeshPhysicalMaterial[];
};

function SolidLetterMesh({ geometry, materials }: SolidLetterMeshProps) {
  return <mesh geometry={geometry} material={materials} castShadow receiveShadow />;
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
  previewMode: "day" | "night";
  onFailedGlyphs?: (count: number) => void;
};

// ── Main export ───────────────────────────────────────────────────────────────

export default function LetterScene(props: LetterSceneProps) {
  const { signType, lightMode, previewMode } = props;
  // Bloom only when something is actually emitting — an illuminated sign at
  // night. In daylight the sign is switched off, so blooming a plain lit face
  // would just fog the preview.
  const bloomActive = signType === "illuminated" && previewMode === "night";
  const bloomIntensity = lightMode === "halo" ? BLOOM_INTENSITY_HALO : BLOOM_INTENSITY_BASE;

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: CAMERA_POS, fov: CAMERA_FOV }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        shadows
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

        {/* Bloom is the only post-processing pass. Always mounted (intensity
            drops to 0 when the sign is off) rather than conditionally
            mounted/unmounted — (un)mounting EffectComposer re-initialises its
            render targets, which read as a one-frame flicker/lag exactly
            when switching Svetelné/Nesvetelné or Deň/Noc. */}
        <EffectComposer frameBufferType={THREE.HalfFloatType}>
          <Bloom
            mipmapBlur
            luminanceThreshold={BLOOM_LUMINANCE_THRESHOLD}
            luminanceSmoothing={BLOOM_LUMINANCE_SMOOTHING}
            intensity={bloomActive ? bloomIntensity : 0}
            radius={BLOOM_RADIUS}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

// ── Wall backdrop texture ────────────────────────────────────────────────────
// A painted-in vertical gradient + soft vignette on a canvas, used as the wall
// material's map. Cheap, deterministic, and reads far better than a flat colour.

function useWallTexture(stops: [string, string, string]): THREE.CanvasTexture | null {
  const tex = useMemo(() => {
    if (typeof document === "undefined") return null;
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, stops[0]);
    grad.addColorStop(0.55, stops[1]);
    grad.addColorStop(1, stops[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const vignette = ctx.createRadialGradient(
      size / 2, size * 0.42, size * 0.2,
      size / 2, size / 2, size * 0.95,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);

    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [stops]);

  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
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
  previewMode,
  onFailedGlyphs,
}: LetterSceneProps) {
  const safeText  = text?.trim() || "Váš text";
  const isNight   = previewMode === "night";
  const isIlluminated = signType === "illuminated";

  const fontOpt = useMemo(
    () => fontOptions.find((f) => f.id === font) ?? fontOptions[0],
    [font],
  );
  // The sign renders exactly what the customer typed, in their own casing.
  // This used to force .toUpperCase() on every non-script face, so someone who
  // typed "Kaviareň" was shown — and quoted for — "KAVIAREŇ".
  const displayText = safeText;

  const glowColor = useMemo(() => new THREE.Color(safeColor(lightColor)), [lightColor]);
  const baseColor = useMemo(() => new THREE.Color(safeColor(letterColor)), [letterColor]);

  const ls = getLightingSettings(signType, lightMode, isNight);

  const heightScale = Math.min(1.15, Math.max(0.78, height / 45));
  const lenScale    = Math.min(1, 6.5 / Math.max(safeText.length, 6));
  const finalScale  = heightScale * lenScale;

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

  // Park the wall just behind the sign's back face so the letters read as
  // surface-mounted (the small gap = a realistic stand-off mount).
  const wallZ = -(depthUnits * finalScale) / 2 - 0.06;
  const wallStops = isNight ? WALL_GRADIENT_NIGHT : WALL_GRADIENT_DAY;
  const wallTexture = useWallTexture(wallStops);

  // Wall-wash strength and spread. `full` spills only a fraction of what a
  // dedicated halo sign throws; the spread follows the sign's own scale so a
  // long nápis is lit across its whole width, not just behind its centre.
  const washIntensity =
    HALO_LIGHT_INTENSITY * (lightMode === "full" ? FULL_WASH_FACTOR : 1);
  const washSpread = Math.max(0.9, finalScale * 2.2);

  return (
    <>
      {/* ── Lighting — even studio fill + one key light that throws the
          letters' shadow onto the wall behind them ── */}
      <ambientLight intensity={isNight ? 0.35 : 1.15} />
      <directionalLight
        position={[3.2, 4.2, 3.5]}
        intensity={isNight ? 0.7 : 2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={0.1}
        shadow-camera-far={26}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <directionalLight position={[-4, 1.5, 2.5]} intensity={isNight ? 0.12 : 0.55} />

      {/* ── Halo wall wash ────────────────────────────────────────────────
          The piece that actually makes "Zozadu" work. The back face of the
          letters emits toward the wall, but emissive materials illuminate
          nothing around them, and that face is hidden from the camera — so
          without these lights the mode showed a dim letter against a dark
          wall and read as broken.

          Three point lights sit in the gap between the sign and the wall,
          spread horizontally so a wide nápis is washed evenly rather than
          having one hotspot behind its middle. They carry the chosen LED
          colour, and their distance/decay is what spreads the pool of light
          outward across the wall. */}
      {isIlluminated && isNight && (lightMode === "halo" || lightMode === "full") && (
        <>
          {[-1, 0, 1].map((offset) => (
            <pointLight
              key={offset}
              position={[offset * washSpread, 0.08, wallZ + HALO_LIGHT_WALL_GAP]}
              color={glowColor}
              distance={HALO_LIGHT_DISTANCE}
              decay={HALO_LIGHT_DECAY}
              intensity={washIntensity}
            />
          ))}
        </>
      )}

      {/* ── Smooth matte wall the sign is mounted on ── */}
      <mesh position={[0, 0, wallZ]} receiveShadow>
        <planeGeometry args={[110, 60]} />
        <meshStandardMaterial
          map={wallTexture ?? undefined}
          color={wallTexture ? "#ffffff" : wallStops[1]}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* ── Sign geometry — mounted flat on the wall; the viewer can drag
          within a limited arc (OrbitControls below) ── */}
      <Center position={[0, 0.08, 0]} scale={finalScale}>
        <group rotation={[VIEW_TILT, 0, 0]}>
          {/* Own Suspense boundary — switching fonts only hides the letters
              while their TTF loads, never the wall/lights/HDRI. */}
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

      {/* ── Image-based lighting — own Suspense so the HDRI fetch doesn't block text ── */}
      <Suspense fallback={null}>
        <Environment
          files={ENV_HDR_PATH}
          background={false}
          environmentIntensity={isNight ? ENV_INTENSITY_NIGHT : ENV_INTENSITY}
        />
      </Suspense>

      {/* Drag to look around the sign — locked to a tasteful arc, no zoom/pan. */}
      <OrbitControls
        makeDefault
        target={CAMERA_TARGET}
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={Math.PI / 2 - 0.32}
        maxPolarAngle={Math.PI / 2 + 0.12}
        minAzimuthAngle={-ORBIT_AZIMUTH}
        maxAzimuthAngle={ORBIT_AZIMUTH}
      />
    </>
  );
}

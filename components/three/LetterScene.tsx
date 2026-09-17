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
  buildHaloGlowTexture,
  MATERIAL_GROUP,
} from "@/components/three/letterGeometry";
import type { SignType, LightModeId, MaterialOption } from "@/lib/types";
import { WALL_SURFACES, DEFAULT_WALL, type WallGrain } from "@/lib/walls";
import { useWallTexture, usePhotoTexture } from "@/components/three/wallTexture";

// ─────────────────────────────────────────────────────────────────────────────
// TUNABLE CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ENV_HDR_PATH        = "/hdri/studio.hdr";
const ENV_INTENSITY       = 0.75;   // day — neutral studio HDRI
const ENV_INTENSITY_NIGHT = 0.4;   // night — dim ambient so emissives pop
const TONEMAP_EXPOSURE    = 0.95;

// PBR texture tiling (tiles per letter face) — asset folder names kept as-is,
// only the material catalog ids ("kompozit" / "3dtlac") changed.
const KOMPOZIT_REPEAT = 2;   // metal_plate — 2× gives realistic scale
const THREED_REPEAT   = 8;   // ribbed_corduroy — 8× simulates fine FDM layer lines

// Bloom — the ONLY light source is material emissive; no scene point-lights
// drive it. Threshold tuned so only emissive faces bloom.
const BLOOM_LUMINANCE_THRESHOLD = 0.85;
const BLOOM_LUMINANCE_SMOOTHING = 0.4;
const BLOOM_RADIUS              = 0.75;
const BLOOM_INTENSITY_BASE      = 0.9;   // front
const BLOOM_INTENSITY_FULL      = 0.35;   // full — the whole body glows, so it flares far sooner
const BLOOM_INTENSITY_HALO      = 1.15;  // halo — the glow texture is already bright; bloom only flares it

// Depth (mm) → world-unit scale. The range the workshop makes is 4–10 mm for
// a cut letter and up to 200 mm for the deepest lit build (lib/options.ts), so
// this divisor puts the deepest letter at ~0.2 units against a glyph size of
// 0.78. That is about twice the true proportion of a 50 mm box on a 35 cm
// letter — enough relief to read in a small preview without pretending the
// sign is deeper than it is. First constant to re-tune if depth looks wrong.
const DEPTH_SCALE_DIVISOR = 250;
const MIN_DEPTH_UNITS     = 0.012; // crash-safety floor only, not a visual design choice

const TEXT_DEBOUNCE_MS = 300; // only text/thickness are debounced — font switches are discrete clicks, not rapid-fire

// Default 3/4 view. The sign doesn't auto-rotate, but the viewer can drag
// within a limited arc (see OrbitControls in SceneContent) to look around it.
const CAMERA_POS: [number, number, number]    = [1.9, 0.78, 7.9];
const CAMERA_TARGET: [number, number, number] = [0, 0.05, 0];
const CAMERA_FOV = 30;
const ORBIT_AZIMUTH = Math.PI / 4;   // ± horizontal drag range (45°)
const VIEW_TILT = -0.04; // tiny forward pitch of the letter group (radians)
// How far the camera sits from what it is looking at. Taken from the two
// constants above rather than read off the live camera, so the framing the
// photo backdrop is sized for does not change as the viewer drags the sign.
const NOMINAL_VIEW_DISTANCE = Math.hypot(
  CAMERA_POS[0] - CAMERA_TARGET[0],
  CAMERA_POS[1] - CAMERA_TARGET[1],
  CAMERA_POS[2] - CAMERA_TARGET[2],
);

// The wall the letters are mounted on. It used to be a flat 110 × 60 plane
// with a painted gradient; it is a real surface now — plaster, render,
// concrete or brick — tiled at true scale (components/three/wallTexture.ts),
// or the customer's own photo of the wall the sign is going on.
//
// 46 × 26 units is far wider than the camera can see even at the ends of its
// orbit, and small enough that the tiling stays crisp.
const WALL_WIDTH  = 46;
const WALL_HEIGHT = 26;
const WALL_BUMP_SCALE = 0.012; // grain catches the key light; higher looks like gravel

// A photo backdrop hangs just in front of the wall. It is sized to what the
// camera can actually SEE at the wall, not to the whole backdrop plane — the
// wall is 46 units wide while the shot is about 9, so covering the plane
// blew every photo up some five times and showed one blurry patch of it.
// The factor leaves room to drag the view around without running off the
// photo's edge.
const PHOTO_WALL_OFFSET = 0.0015;
const PHOTO_COVER = 2.2;

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
  // Halo: nothing the camera can see emits. The face and the returns stay the
  // material's own colour — a back-lit letter reads as a dark silhouette — and
  // the light lives entirely on the wall behind it (see HaloGlow below). The
  // side used to carry 0.16, which drew a bright rule around every glyph and
  // made the sign look like a neon tube rather than a back-lit letter.
  halo:  { front: 0.00, side: 0.06, back: 1.00 },
  // Full: the whole body lights up, but a lit letter is still an object —
  // in a photo of one you can see the seam between the face and the return,
  // and the returns sit a shade darker. These used to be high enough that the
  // face clipped to a flat slab of colour with the letterform boiled out of
  // it, which is what "príliš intenzívne" was describing.
  full:  { front: 0.58, side: 0.38, back: 0.30 },
};
const EMISSIVE_BASE_INTENSITY   = 3.2;
const EMISSIVE_NIGHT_MULTIPLIER = 1.55;

// ── Halo wall glow ──────────────────────────────────────────────────────────
// The wall glow is a texture built from the glyph outlines themselves
// (letterGeometry.ts buildHaloGlowTexture), laid flat on the wall with
// additive blending. That is what makes the light follow the letterform —
// tight at the contour, fading out over half a letter height, and glowing
// inside counters like the bowl of an "A".
//
// It replaced three point lights parked behind the sign: point lights throw
// round pools, so a wide nápis was lit by a row of blobs that had nothing to
// do with its letters.
//
// The gain is a multiplier on the LED colour. Above 1 the core of the glow
// passes the bloom threshold, so the halo blooms the way a real one flares on
// camera. The framebuffer is HalfFloat (see the Canvas below), so values over
// 1 survive to the bloom pass instead of being clipped.
const HALO_GLOW_GAIN        = 2.8;
// How far the glow's own colour is pulled toward white before the gain is
// applied. Without it a saturated LED colour can never clip to white, and the
// halo stays flatly amber across its whole spread. With it the core clips —
// bright warm white right at the contour, easing back into the LED's own
// colour as it fades — which is what a back-lit sign looks like in a photo.
const HALO_GLOW_WHITE_MIX   = 0.34;
const HALO_GLOW_FULL_FACTOR = 0.15; // a fully lit sign spills too, far less
const HALO_GLOW_WALL_OFFSET = 0.004; // in front of the wall, to avoid z-fighting

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
  /**
   * Optional: a material whose colour is the customer's choice must not carry
   * a photographed colour map. `map` MULTIPLIES the base colour, so a dark
   * photo (the composite's is a dark bronze, average rgb 60,48,26) drags every
   * colour down to near-black — which is exactly what happened to the exterior
   * composite: a red sign rendered black. Its structure comes from the normal
   * and roughness maps instead, which is what a powder-coated panel is anyway.
   */
  map?:          THREE.Texture;
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
  if (texSet.map) mat.map = texSet.map;
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
    if (map) configTex(map, THREE.SRGBColorSpace, repeat, maxAniso);
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
  // No colour map here on purpose (see TexSet.map) — and one fewer 2.6 MB
  // texture to download for it.
  const [roughMap, normalMap, metalMap] = useTexture([
    "/textures/alubond/roughness.jpg",
    "/textures/alubond/normal.jpg",
    "/textures/alubond/metalness.jpg",
  ]);
  const triple = useTexturedTriple(
    matOpt, baseColor, glowColor, ls, isIlluminated,
    { roughnessMap: roughMap, normalMap, metalnessMap: metalMap },
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

// ── Halo wall glow ────────────────────────────────────────────────────────────
// The glow plane. It hangs flat on the wall, behind the letters and outside
// <Center>, so it is never part of the group's bounding box — dropping it
// inside would shift the sign's own centring and re-frame the shot.
//
// The letter geometry is centred on its own bounding box (letterGeometry.ts),
// and this texture is built from the same glyph outlines around the same
// centre, so both line up by construction at any scale.

type HaloGlowProps = {
  fontFile: string;
  text: string;
  color: THREE.Color;
  gain: number;
  scale: number;
  y: number;
  z: number;
};

function HaloGlow({ fontFile, text, color, gain, scale, y, z }: HaloGlowProps) {
  const font = useTTFFont(fontFile); // already cached by the letters themselves
  const build = useMemo(() => buildHaloGlowTexture(font, text), [font, text]);

  useEffect(() => () => build.texture?.dispose(), [build]);

  // Over 1 on purpose — see HALO_GLOW_GAIN / HALO_GLOW_WHITE_MIX.
  const tint = useMemo(
    () => color.clone().lerp(new THREE.Color(0xffffff), HALO_GLOW_WHITE_MIX).multiplyScalar(gain),
    [color, gain],
  );

  if (!build.texture) return null;

  return (
    <mesh position={[0, y, z]} scale={scale} renderOrder={-1}>
      <planeGeometry args={[build.width, build.height]} />
      <meshBasicMaterial
        map={build.texture}
        color={tint}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

// ── Component types ───────────────────────────────────────────────────────────

type LetterSceneProps = {
  text: string;
  /** Preview-only: the surface the sign is shown against. */
  wall?: WallGrain;
  /** Preview-only: object URL of the customer's own photo, if they picked one. */
  backgroundUrl?: string | null;
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
  const bloomIntensity =
    lightMode === "halo" ? BLOOM_INTENSITY_HALO
    : lightMode === "full" ? BLOOM_INTENSITY_FULL
    : BLOOM_INTENSITY_BASE;

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

// ── Scene content ─────────────────────────────────────────────────────────────

function SceneContent({
  text,
  wall = DEFAULT_WALL,
  backgroundUrl,
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

  const surface = WALL_SURFACES.find((w) => w.id === wall) ?? WALL_SURFACES[0];
  const wallTexture = useWallTexture(surface.id, WALL_WIDTH, WALL_HEIGHT);
  const photo = usePhotoTexture(backgroundUrl ?? null);

  // `background-size: cover`, in world units: fill the framed view, overflow
  // on the long side, never squash the photo.
  const { size: viewportSize } = useThree();
  const photoSize = useMemo<[number, number]>(() => {
    const visibleHeight =
      2 * Math.tan((CAMERA_FOV * Math.PI) / 180 / 2) * NOMINAL_VIEW_DISTANCE * PHOTO_COVER;
    const visibleWidth = visibleHeight * (viewportSize.width / Math.max(1, viewportSize.height));

    const img = photo?.texture.image as { width?: number; height?: number } | undefined;
    const aspect = img?.width && img?.height ? img.width / img.height : 16 / 9;

    const byWidth: [number, number] = [visibleWidth, visibleWidth / aspect];
    return byWidth[1] >= visibleHeight ? byWidth : [visibleHeight * aspect, visibleHeight];
  }, [photo, viewportSize.width, viewportSize.height]);

  const glowGain =
    HALO_GLOW_GAIN * (lightMode === "full" ? HALO_GLOW_FULL_FACTOR : 1);
  const wallGlowOn =
    isIlluminated && isNight && (lightMode === "halo" || lightMode === "full");

  return (
    <>
      {/* ── Lighting — even studio fill + one key light that throws the
          letters' shadow onto the wall behind them ── */}
      <ambientLight intensity={isNight ? 0.35 : 0.75} />
      <directionalLight
        position={[3.2, 4.2, 3.5]}
        intensity={isNight ? 0.7 : 1.35}
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

      {/* ── The wall the sign is mounted on ── */}
      <mesh position={[0, 0, wallZ]} receiveShadow>
        <planeGeometry args={[WALL_WIDTH, WALL_HEIGHT]} />
        <meshStandardMaterial
          map={wallTexture ?? undefined}
          bumpMap={wallTexture ?? undefined}
          bumpScale={WALL_BUMP_SCALE}
          color={photo ? photo.tint : isNight ? surface.nightTint : surface.dayTint}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* ── …or the customer's own photo of it ──────────────────────────────
          Its own plane in front of the painted wall rather than a swapped
          texture: the photo keeps its proportions that way, and the painted
          surface stays underneath while it loads. It receives the letters'
          shadow like any other wall, which is what makes a photo read as a
          place the sign is actually mounted. ── */}
      {photo && (
        <mesh position={[0, 0, wallZ + PHOTO_WALL_OFFSET]} receiveShadow>
          <planeGeometry args={photoSize} />
          <meshStandardMaterial
            map={photo.texture}
            color={isNight ? "#8f8f94" : "#ffffff"}
            roughness={1}
            metalness={0}
          />
        </mesh>
      )}

      {/* ── The glow the wall actually carries ── */}
      {wallGlowOn && (
        <Suspense fallback={null}>
          <HaloGlow
            fontFile={fontOpt.file}
            text={debouncedText}
            color={glowColor}
            gain={glowGain}
            scale={finalScale}
            y={0.08}
            z={wallZ + HALO_GLOW_WALL_OFFSET}
          />
        </Suspense>
      )}

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

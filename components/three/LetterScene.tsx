"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, Environment, OrbitControls, useTexture } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { MATERIALS, fontOptions, finishForColor, faceKindFor, type FaceKind } from "@/lib/options";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  useTTFFont,
  buildSolidLetterGeometry,
  buildHaloGlowTexture,
  capHeightLocal,
  MATERIAL_GROUP,
} from "@/components/three/letterGeometry";
import type { SignType, LightModeId, MaterialOption } from "@/lib/types";
import { WALL_SURFACES, DEFAULT_WALL, type WallGrain } from "@/lib/walls";
import { useWallTexture, usePhotoTexture } from "@/components/three/wallTexture";
import { mmToUnits } from "@/components/three/scale";

// ─────────────────────────────────────────────────────────────────────────────
// TUNABLE CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ENV_HDR_PATH        = "/hdri/studio.hdr";
// Ambient, not glow. Lifted so the BODY COLOUR of the letter reads in every
// mode: the customer picks a colour from a swatch and has to see that colour
// on the sign, whether it is lit from the front, the back or the edges. It
// does not touch how bright the LEDs are — that is the emissive below.
const ENV_INTENSITY       = 0.92;  // day — neutral studio HDRI
const ENV_INTENSITY_NIGHT = 0.52;  // night — dim, but never so dim the colour goes grey
const TONEMAP_EXPOSURE    = 0.95;

// PBR texture tiling (tiles per letter face) for the 3D-print layer lines —
// the only build that carries a surface texture.
const THREED_REPEAT   = 8;   // ribbed_corduroy — 8× simulates fine FDM layer lines

// Bloom — the ONLY light source is material emissive; no scene point-lights
// drive it. Threshold tuned so only emissive faces bloom.
const BLOOM_LUMINANCE_THRESHOLD = 0.85;
const BLOOM_LUMINANCE_SMOOTHING = 0.4;
const BLOOM_RADIUS              = 0.75;
// Softened across the board — bloom is what turns a bright face into a white
// blob, so each mode gets only as much flare as it needs to read as light.
const BLOOM_INTENSITY_BASE      = 0.34; // front — the lit face
const BLOOM_INTENSITY_EDGE      = 0.28; // edges — a thin bright rim, easy to overdo
const BLOOM_INTENSITY_HALO      = 0.3;  // back — the glow texture already IS the soft light; more bloom only fogs the face
// A saturated LED is darker than a white one at the same drive, so with a
// fixed threshold it never reached the bloom at all and a red sign looked
// like red plastic rather than a red light. The threshold comes down and the
// flare comes up in proportion to how saturated the colour is, which is what
// puts the glow back without pushing the colour to white again.
const BLOOM_THRESHOLD_SAT_DROP  = 0.45;
const BLOOM_INTENSITY_SAT_GAIN  = 0.55;

// Depth is at true scale too (mmToUnits), so a 60 mm profile on a 300 mm
// letter reads as exactly that. This floor only keeps a degenerate extrusion
// from being built.
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
// Big enough that the camera never sees past it, even standing back for a
// two-metre nápis at the end of its orbit. The texture tiles at true scale, so
// the size of the plane costs nothing in sharpness.
const WALL_WIDTH  = 400;
const WALL_HEIGHT = 240;
const WALL_BUMP_SCALE = 0.012; // grain catches the key light; higher looks like gravel

// A photo backdrop hangs just in front of the wall. It is sized to what the
// camera can actually SEE at the wall, not to the whole backdrop plane — the
// wall is 46 units wide while the shot is about 9, so covering the plane
// blew every photo up some five times and showed one blurry patch of it.
// The factor leaves room to drag the view around without running off the
// photo's edge.
// ── Framing ───────────────────────────────────────────────────────────────────
// The sign is always at true size (components/three/scale.ts), so what changes
// with its size is where the camera stands. On a painted wall it stands back
// just far enough to see the whole nápis, and the share of the picture the
// sign takes grows gently with its height — so a bigger sign still LOOKS
// bigger while the bricks shrink behind it, and a small one is not a speck.
const FRAME_FILL_AT_300MM = 0.30;   // share of the frame height a 300 mm sign takes
const FRAME_FILL_CURVE    = 0.35;   // how that share grows with height (0 = never)
const FRAME_FILL_MIN      = 0.16;
const FRAME_FILL_MAX      = 0.62;
const FRAME_WIDTH_FILL    = 0.76;   // leaves room for the near end, which perspective enlarges
const FRAME_MIN_DISTANCE  = 0.9;
const FRAME_EASE          = 0.14;   // per frame — size changes glide instead of jump

// How far off the wall the letters stand. Back-lit letters sit on spacers so
// the light has room to spread behind them; everything else is close-mounted.
const WALL_GAP_MM      = 10;
const WALL_GAP_HALO_MM = 30;

const PHOTO_WALL_OFFSET = 0.0015;
const PHOTO_COVER = 2.2;

// Emissive scale per light mode, per face group (front cap / side wall / back
// cap). The three modes are the ones the price list sells: spredu, zozadu,
// hranami.
//
// All three were toned down: a lit sign at night is bright, but on a screen a
// face driven to the top of the range clips to a flat slab of colour with the
// letterform boiled out of it. Keeping the face under that ceiling is what
// leaves the shape — and the seam between face and return — readable.
const FACE_EMISSIVE: Record<LightModeId, { front: number; side: number; back: number }> = {
  // Front-lit: the face carries the light, the returns barely pick any up.
  front: { front: 0.52, side: 0.04, back: 0.02 },
  // Back-lit: nothing the camera can see emits. The face and the returns stay
  // the material's own colour — a back-lit letter reads as a dark silhouette —
  // and the light lives entirely on the wall behind it (see HaloGlow below).
  back:  { front: 0.00, side: 0.04, back: 0.58 },
  // Edge-lit: the light leaves through the cut edge of the acrylic, so the
  // side wall is the bright part and the face only catches what travels
  // through the sheet.
  edge:  { front: 0.10, side: 0.62, back: 0.07 },
};
// Eased off twice now (3.2 / 1.55 → 2.3 / 1.3 → here): past a point the glow
// stops being light ON a letter and becomes a white shape instead, and on a
// screen that point comes far sooner than on a real façade.
const EMISSIVE_BASE_INTENSITY   = 1.75;
const EMISSIVE_NIGHT_MULTIPLIER = 1.15;
// How much of that is taken away from a fully saturated LED colour, so it
// survives tone mapping as a colour instead of clipping to white. 0 = the old
// behaviour (everything white), 1 = a saturated LED would not glow at all.
const SATURATED_EMISSIVE_CUT    = 0.42;

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
// Brightness of the halo at the letter's edge. Was 1.65, which with the old
// letter-sized reach turned the wall into one white slab and fogged the face
// of the letter itself; a real halo is bright at the edge and gone soon after.
const HALO_GLOW_GAIN        = 1.3;
// How far the light spreads past the letter's edge, in real millimetres:
// back-lit letters stand ~30 mm off the wall, and the pool they throw fades
// out within about three times that. The soft aura round a front- or edge-lit
// letter is scatter from its face and reaches less far still.
const HALO_REACH_MM         = 95;
const AURA_REACH_MM         = 55;
// The same glow, much weaker, around a front- or edge-lit sign.
//
// Why it exists: a saturated LED cannot be both bright enough to bloom and
// still recognisably its own colour — drive a blue face hard enough to flare
// and tone mapping turns it white, back it off enough to stay blue and it
// stops looking lit at all. So the "it is switched on" read comes from a soft
// aura around the letter instead of from the face's own brightness, and the
// face is free to just be blue.
const HALO_GLOW_GAIN_FRONT  = 0.52;
const HALO_GLOW_GAIN_EDGE   = 0.44;
// How far the glow's own colour is pulled toward white before the gain is
// applied. Without it a saturated LED colour can never clip to white, and the
// halo stays flatly amber across its whole spread. With it the core clips —
// bright warm white right at the contour, easing back into the LED's own
// colour as it fades — which is what a back-lit sign looks like in a photo.
const HALO_GLOW_WHITE_MIX   = 0.34;
const HALO_GLOW_WALL_OFFSET = 0.004; // in front of the wall, to avoid z-fighting

// How far a transmissive material's (plexi) body colour is pulled toward
// white when illuminated (0 = full bodyColor, 1 = fully white).
//
// It used to be 0.45, which was the single biggest reason a colour looked
// different depending on the light mode: edge-lit signs are made in 30 mm
// plexi, so picking red there gave a washed pink while the same red on an
// unlit sign was red. Kept small — lit acrylic really does lighten — but not
// nearly enough to lose which colour was chosen.
const WHITE_BASE_BLEND = 0.12;

// ─────────────────────────────────────────────────────────────────────────────

type LightSettings = {
  emissiveFront: number;
  emissiveSide:  number;
  emissiveBack:  number;
};

/**
 * How hard a colour can be driven before it stops being that colour.
 *
 * ACES tone mapping rolls bright values off toward white, and a saturated LED
 * is dark to begin with — so it has to be driven hard to look lit, and by the
 * time it looks lit it has rolled off to white. Measured: red, green and blue
 * all came out of the renderer as #ffffff, indistinguishable from each other
 * and from the whites.
 *
 * So a saturated colour gets less emissive, not more. It still reads as light
 * (it is well above the bloom threshold) but it stays red, green or blue. A
 * white LED is unaffected, which is what keeps the warm white looking the way
 * it did.
 */
function saturationHeadroom(color: THREE.Color): number {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return 1 - SATURATED_EMISSIVE_CUT * hsl.s;
}

function getLightingSettings(
  signType: SignType,
  lightMode: LightModeId,
  night: boolean,
  glowColor: THREE.Color,
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
  const n    = EMISSIVE_NIGHT_MULTIPLIER * EMISSIVE_BASE_INTENSITY * saturationHeadroom(glowColor);
  return {
    emissiveFront: base.front * n,
    emissiveSide:  base.side  * n,
    emissiveBack:  base.back  * n,
  };
}

function safeColor(v: string): string {
  return !v || v.includes("gradient") ? "#00c8ff" : v;
}

function safeColorHex(color: THREE.Color): string {
  return `#${color.getHexString()}`;
}

// Turn a chosen finish into the PBR surface it physically is. Only the matt
// lacquer differs from the default now — the brushed and mirrored metals were
// taken out of the catalogue, so the code that rendered them went with them.
function applyFinish(
  params: THREE.MeshPhysicalMaterialParameters,
  hex: string,
  roughness: number,
): void {
  if (finishForColor(hex) === "matte") {
    params.roughness = Math.min(1, roughness * 1.9 + 0.2);
    params.clearcoat = 0;
  }
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
    // A fully transmissive surface takes almost nothing from `color` — light
    // goes straight through it — which is why a coloured plexi letter used to
    // read as clear glass whatever swatch was picked. Tinted acrylic is
    // coloured by what the light loses on its way THROUGH the sheet, so the
    // chosen colour belongs here, as the attenuation.
    params.attenuationColor    = baseColor;
    params.attenuationDistance = p.attenuationDistance ?? 0.22;
  } else {
    // A matt lacquer is the same paint with the sheen taken out of it. Skipped
    // for transmissive materials (plexi), whose surface is the acrylic itself,
    // not a coating.
    applyFinish(params, safeColorHex(color), roughness);
  }

  return new THREE.MeshPhysicalMaterial(params);
}

// ── The face ────────────────────────────────────────────────────────────────
//
// What the front of the letter is made of changes how it looks far more than
// its colour does (lib/options.ts faceKindFor):
//
//   · a translucent ACRYLIC face — the front of a lit channel letter or of a
//     3D-printed letter with a plexi front — is smooth and glossy, never takes
//     the brushed-metal or print texture of its return, and when it is lit from
//     behind it glows in the colour the light has AFTER passing through it:
//     white LEDs behind a red face make a red letter, exactly as in a shop
//     window. That is the whole reason a lit sign is ordered with a face colour;
//   · a UV-PRINTED face is a satin print on acrylic;
//   · otherwise the face is the same stuff as the return, just its own colour.

// Clear cast acrylic: a mirror-smooth sheet with a lacquer-like top coat.
const ACRYLIC_FACE = { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06 } as const;
// UV print: the ink lies ON the sheet, so it is satin rather than glass.
const PRINT_FACE   = { roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.4 } as const;

/**
 * The colour a front-lit acrylic face actually emits: the LED's light with the
 * face's own colour filtering it. The face colour is normalised to its
 * brightest channel first, so a colour tints the light rather than dimming it
 * — a red face lets the red through at full strength.
 */
function filteredThroughFace(led: THREE.Color, face: THREE.Color): THREE.Color {
  const peak = Math.max(face.r, face.g, face.b, 1e-3);
  return led.clone().multiply(new THREE.Color(face.r / peak, face.g / peak, face.b / peak));
}

/** What the lit part of the sign really shines in — for bloom and headroom. */
function emittedColor(
  led: THREE.Color,
  face: THREE.Color,
  faceKind: FaceKind,
  lightMode: LightModeId,
): THREE.Color {
  return faceKind === "acrylic" && lightMode === "front" ? filteredThroughFace(led, face) : led;
}

function buildFaceMat(
  faceKind: FaceKind,
  matOpt: MaterialOption,
  faceColor: THREE.Color,
  glowColor: THREE.Color,
  emissiveIntensity: number,
  isIlluminated: boolean,
): THREE.MeshPhysicalMaterial {
  if (faceKind === "acrylic" || faceKind === "print") {
    const look = faceKind === "acrylic" ? ACRYLIC_FACE : PRINT_FACE;
    return new THREE.MeshPhysicalMaterial({
      color: faceColor,
      // Only an acrylic face lets light out; a print is opaque ink.
      emissive: faceKind === "acrylic" ? filteredThroughFace(glowColor, faceColor) : new THREE.Color(0x000000),
      emissiveIntensity: faceKind === "acrylic" ? emissiveIntensity : 0,
      metalness: 0,
      ...look,
    });
  }
  // Same material as the return (or 30 mm plexi, which is all one piece).
  return buildPhysicalMat(matOpt, faceColor, glowColor, emissiveIntensity, false, isIlluminated);
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
  faceColor: THREE.Color = baseColor,
  faceKind: FaceKind = "none",
): MaterialTriple {
  return {
    // The return — its own colour, its own material.
    sideMat:  buildPhysicalMat(matOpt, baseColor.clone(), glowColor.clone(), ls.emissiveSide,  true,  isIlluminated),
    backMat:  buildPhysicalMat(matOpt, baseColor.clone(), glowColor.clone(), ls.emissiveBack,  false, isIlluminated),
    // The face — see buildFaceMat.
    frontMat: buildFaceMat(faceKind, matOpt, faceColor.clone(), glowColor.clone(), ls.emissiveFront, isIlluminated),
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
  faceColor:     THREE.Color,
  faceKind:      FaceKind,
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
    const t = buildMaterialTriple(matOpt, baseColor, glowColor, ls, isIlluminated, faceColor, faceKind);
    applyTexToMat(t.sideMat, stableTexSet);
    applyTexToMat(t.backMat, stableTexSet);
    // An acrylic or printed face is a different material from the return —
    // brushed aluminium or print lines on it would be the one thing that
    // gives the render away.
    if (faceKind === "same" || faceKind === "none") applyTexToMat(t.frontMat, stableTexSet);
    return t;
  }, [matOpt, baseColor, glowColor, ls, isIlluminated, stableTexSet, faceColor, faceKind]);

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
  faceColor:     THREE.Color;
  faceKind:      FaceKind;
};

function ThreeDLetters({ matOpt, baseColor, glowColor, ls, isIlluminated, geometry, faceColor, faceKind }: TexLetterProps) {
  // No colour map (see TexSet.map): the print photo averages a greenish
  // grey (rgb 141,147,128), which turned a yellow print olive and every other
  // colour a shade darker than its swatch. The layer lines are relief — the
  // normal and roughness maps carry them.
  const [roughMap, normalMap] = useTexture([
    "/textures/3dtlac/roughness.jpg",
    "/textures/3dtlac/normal.jpg",
  ]);
  const triple = useTexturedTriple(
    matOpt, baseColor, glowColor, ls, isIlluminated,
    { roughnessMap: roughMap, normalMap },
    THREED_REPEAT,
    faceColor,
    faceKind,
  );
  return <SolidLetterMesh geometry={geometry} materials={toMaterialArray(triple)} />;
}

type LetterVariantProps = TexLetterProps & {
  material: string;
  fallback: THREE.MeshPhysicalMaterial[];
};

function LetterVariant({ material, fallback, geometry, ...rest }: LetterVariantProps) {
  const fallbackMesh = <SolidLetterMesh geometry={geometry} materials={fallback} />;

  // Alurol has no texture on purpose: it is a lacquered aluminium band with
  // a smooth, glossy finish, and a brushed-metal map is exactly what it is not.
  if (material === "print3d" || material === "print3d-solid") {
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
  /** Ordered letter height — the cap height, in millimetres. */
  heightMm: number;
  /** Depth of the build in world units, already at true scale. */
  worldDepth: number;
  material: string;
  matOpt: MaterialOption;
  baseColor: THREE.Color;
  glowColor: THREE.Color;
  ls: LightSettings;
  isIlluminated: boolean;
  faceColor: THREE.Color;
  faceKind: FaceKind;
  fallbackTriple: MaterialTriple;
  onFailedGlyphs?: (count: number) => void;
  /** The sign's size on the wall, in world units — for framing the camera. */
  onBounds?: (bounds: { width: number; height: number }) => void;
};

function LetterGeometryHost({
  fontFile, text, heightMm, worldDepth, material, matOpt, baseColor, glowColor, ls, isIlluminated,
  faceColor, faceKind, fallbackTriple, onFailedGlyphs, onBounds,
}: LetterGeometryHostProps) {
  const font = useTTFFont(fontFile);

  // True scale: the capital of THIS font is made exactly as tall as ordered,
  // in the same millimetres the brick wall is drawn in (components/three/
  // scale.ts). The geometry is built at the font's own size and scaled as a
  // whole, so its depth has to be given in that unscaled space.
  const signScale = mmToUnits(heightMm) / capHeightLocal(font);
  const localDepth = Math.max(MIN_DEPTH_UNITS, worldDepth / signScale);

  const build = useMemo(
    () => buildSolidLetterGeometry(font, text, localDepth),
    [font, text, localDepth],
  );

  // How big the sign is on the wall, so the camera can stand back far enough
  // to see all of it — instead of the sign being shrunk to fit, which is what
  // used to throw its size against the bricks off.
  useEffect(() => {
    const g = build.geometry;
    if (!g || !onBounds) return;
    g.computeBoundingBox();
    const bb = g.boundingBox;
    if (!bb) return;
    onBounds({
      width: (bb.max.x - bb.min.x) * signScale,
      height: (bb.max.y - bb.min.y) * signScale,
    });
  }, [build, signScale, onBounds]);

  useEffect(() => {
    if (build.failedCount > 0) onFailedGlyphs?.(build.failedCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [build]);

  useEffect(() => {
    return () => build.geometry?.dispose();
  }, [build]);

  if (!build.geometry) return null; // every glyph in the string failed to extrude

  return (
    <group scale={signScale}>
      <LetterVariant
        material={material}
        fallback={toMaterialArray(fallbackTriple)}
        matOpt={matOpt}
        baseColor={baseColor}
        glowColor={glowColor}
        ls={ls}
        isIlluminated={isIlluminated}
        geometry={build.geometry}
        faceColor={faceColor}
        faceKind={faceKind}
      />
    </group>
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
  /** Ordered letter height in mm — the glow is scaled exactly like the letters. */
  heightMm: number;
  /** How far the light spreads past the letter's edge, in mm. */
  reachMm: number;
  y: number;
  z: number;
};

function HaloGlow({ fontFile, text, color, gain, heightMm, reachMm, y, z }: HaloGlowProps) {
  const font = useTTFFont(fontFile); // already cached by the letters themselves
  const scale = mmToUnits(heightMm) / capHeightLocal(font);
  // The light's reach is a real distance: what LEDs a few centimetres off the
  // wall throw, the same for a 12 cm letter as for a 2 m one.
  const reach = mmToUnits(reachMm) / scale;
  const build = useMemo(() => buildHaloGlowTexture(font, text, reach), [font, text, reach]);

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

// ── Placing the sign on the customer's own photo ──────────────────────────────
// With a real wall behind it the sign has somewhere it belongs — over the
// door, above the window — so it can be dragged there and left there.
//
// The drag is read off the canvas element, not off the letters: the strokes of
// a script face are a few pixels wide, and hunting for one to grab is not what
// "drag it where you want it" should feel like. Anywhere in the preview works,
// which is also why OrbitControls is switched off while placing — one drag,
// one meaning.
//
// The grab cursor and the touch-action that stops a drag from scrolling the
// page are set as CSS on the wrapper and the canvas (see PLACING_CLASSES and
// the Canvas style below), not by reaching into the renderer from an effect.
export type DragTarget = "sign" | "background";

type PlacementProps = {
  offset: { x: number; y: number };
  onOffsetChange: (offset: { x: number; y: number }) => void;
  /** Where the photo sits behind the sign, in world units. */
  photoOffset: { x: number; y: number };
  onPhotoOffsetChange?: (offset: { x: number; y: number }) => void;
  /** What a plain drag moves — the mouse's right button always moves the photo. */
  target: DragTarget;
  /** World size of the photo plane, for how far it can be pushed. */
  photoSize: [number, number];
};

/** How much of the framed view the sign may be dragged out to (0.5 = the edge). */
const PLACEMENT_REACH = 0.45;

function SignPlacement({
  offset,
  onOffsetChange,
  photoOffset,
  onPhotoOffsetChange,
  target,
  photoSize,
}: PlacementProps) {
  const { gl, camera, size } = useThree();

  // Read inside the pointer handlers without re-attaching them mid-drag.
  const offsetRef = useRef(offset);
  const changeRef = useRef(onOffsetChange);
  const photoRef  = useRef(photoOffset);
  const photoChangeRef = useRef(onPhotoOffsetChange);
  const targetRef = useRef(target);
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { changeRef.current = onOffsetChange; }, [onOffsetChange]);
  useEffect(() => { photoRef.current = photoOffset; }, [photoOffset]);
  useEffect(() => { photoChangeRef.current = onPhotoOffsetChange; }, [onPhotoOffsetChange]);
  useEffect(() => { targetRef.current = target; }, [target]);

  useEffect(() => {
    const el = gl.domElement;

    // One pixel of drag, in world units at the wall's distance — whatever is
    // being dragged follows the pointer exactly, at any canvas size.
    const distance = camera.position.distanceTo(new THREE.Vector3(...CAMERA_TARGET));
    const visibleHeight = 2 * Math.tan((CAMERA_FOV * Math.PI) / 360) * distance;
    const visibleWidth  = visibleHeight * (size.width / size.height);
    const worldPerPx = visibleHeight / size.height;

    // The sign may be pushed most of the way to the edge of the shot; the
    // photo only as far as it has spare image — past that it would slide off
    // its own frame and show the painted wall behind it.
    const signReach  = { x: visibleWidth * PLACEMENT_REACH, y: visibleHeight * PLACEMENT_REACH };
    const photoReach = {
      x: Math.max(0, (photoSize[0] - visibleWidth) / 2),
      y: Math.max(0, (photoSize[1] - visibleHeight) / 2),
    };
    const clamp = (v: number, limit: number) => Math.min(limit, Math.max(-limit, v));

    let pointerId: number | null = null;
    let movingPhoto = false;
    let startX = 0;
    let startY = 0;
    let startOffset = offsetRef.current;

    function onDown(e: PointerEvent) {
      // Left button (or one finger) only: the right button and two fingers
      // turn the view through OrbitControls, the same as on a painted wall.
      // What the drag moves is the picker's choice — sign or photo.
      if (e.button !== 0) return;
      const wantsPhoto = targetRef.current === "background";
      movingPhoto = wantsPhoto && !!photoChangeRef.current;
      if (wantsPhoto && !movingPhoto) return;

      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startOffset = movingPhoto ? photoRef.current : offsetRef.current;
      // Capture keeps the drag alive when the pointer leaves the canvas. It can
      // throw for a pointer the browser no longer tracks — the drag still works
      // through the listeners, so that is not worth an error in the console.
      try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    }

    function onMove(e: PointerEvent) {
      if (pointerId !== e.pointerId) return;
      const reach = movingPhoto ? photoReach : signReach;
      const next = {
        x: clamp(startOffset.x + (e.clientX - startX) * worldPerPx, reach.x),
        // Screen y grows downward, the scene's does not.
        y: clamp(startOffset.y - (e.clientY - startY) * worldPerPx, reach.y),
      };
      if (movingPhoto) photoChangeRef.current?.(next);
      else             changeRef.current(next);
    }

    function onUp(e: PointerEvent) {
      if (pointerId !== e.pointerId) return;
      pointerId = null;
      movingPhoto = false;
      try {
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      } catch { /* already released */ }
    }

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [gl, camera, size.width, size.height, photoSize]);

  return null;
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
  /** The return (side) colour. */
  letterColor: string;
  /** The face colour — the return's when the build has no separate face. */
  faceColor?: string;
  thickness: number;
  material: string;       // MaterialOption.id
  signType: SignType;
  lightMode: LightModeId;
  height: number;
  previewMode: "day" | "night";
  /** Preview-only: where on the wall the sign sits, in world units. */
  offset?: { x: number; y: number };
  /** Preview-only: how far the customer's photo has been pushed behind it. */
  photoOffset?: { x: number; y: number };
  onPhotoOffsetChange?: (offset: { x: number; y: number }) => void;
  /** What a plain drag moves while placing. */
  dragTarget?: DragTarget;
  /**
   * Passing this turns on placement: the sign can be dragged across the
   * backdrop. Set only with the customer's own photo behind it, where the
   * sign has a real place to be put.
   */
  onOffsetChange?: (offset: { x: number; y: number }) => void;
  onFailedGlyphs?: (count: number) => void;
};

// ── Camera framing ─────────────────────────────────────────────────────────────
// Keeps the whole sign in view without changing its size: the sign is at true
// scale, so the camera moves instead. Only the distance changes — the angle
// the customer dragged the view to is kept.
//
// On the customer's own photo the camera does NOT move: the photo is sized to
// a fixed view, so moving the camera would zoom the photo along with the sign
// and the letters would never look any bigger against it. There the sign
// simply grows and shrinks at true scale in front of a photo that shows
// roughly two metres of wall.
function framingDistance(
  bounds: { width: number; height: number },
  heightMm: number,
  aspect: number,
): number {
  const perUnitHeight = 2 * Math.tan((CAMERA_FOV * Math.PI) / 360);
  const fill = Math.min(
    FRAME_FILL_MAX,
    Math.max(FRAME_FILL_MIN, FRAME_FILL_AT_300MM * Math.pow(heightMm / 300, FRAME_FILL_CURVE)),
  );
  const byHeight = bounds.height / (fill * perUnitHeight);
  const byWidth = bounds.width / (FRAME_WIDTH_FILL * perUnitHeight * Math.max(0.5, aspect));
  return Math.max(FRAME_MIN_DISTANCE, byHeight, byWidth);
}

function FramingRig({ distance }: { distance: number }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(...CAMERA_TARGET), []);
  const settled = useRef(false);
  const offset = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    offset.copy(camera.position).sub(target);
    const current = offset.length();
    // The first framing snaps — a page that opens by zooming in on its own
    // would look like it is still loading.
    const next = settled.current ? current + (distance - current) * FRAME_EASE : distance;
    settled.current = true;
    if (Math.abs(next - current) < 1e-4) return;
    offset.setLength(next);
    camera.position.copy(target).add(offset);
  });

  return null;
}

// ── Main export ───────────────────────────────────────────────────────────────

// While the sign can be placed, the preview reads as something to grab.
const PLACING_CLASSES = "cursor-grab active:cursor-grabbing";

/** 0 for white, 1 for a fully saturated LED colour. */
function colourSaturation(hex: string): number {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(safeColor(hex)).getHSL(hsl);
  return hsl.s;
}

export default function LetterScene(props: LetterSceneProps) {
  const { signType, lightMode, previewMode } = props;
  // Bloom follows the colour the sign really shines in (LED through its face),
  // for the same reason the emissive headroom does.
  const glowSat = colourSaturation(
    `#${emittedColor(
      new THREE.Color(safeColor(props.lightColor)),
      new THREE.Color(safeColor(props.faceColor ?? props.letterColor)),
      faceKindFor(props.material, signType, lightMode),
      lightMode,
    ).getHexString()}`,
  );
  // Bloom only when something is actually emitting — an illuminated sign at
  // night. In daylight the sign is switched off, so blooming a plain lit face
  // would just fog the preview.
  const bloomActive = signType === "illuminated" && previewMode === "night";
  const bloomIntensity =
    (lightMode === "back" ? BLOOM_INTENSITY_HALO
     : lightMode === "edge" ? BLOOM_INTENSITY_EDGE
     : BLOOM_INTENSITY_BASE) * (1 + BLOOM_INTENSITY_SAT_GAIN * glowSat);
  const bloomThreshold = BLOOM_LUMINANCE_THRESHOLD - BLOOM_THRESHOLD_SAT_DROP * glowSat;

  return (
    <div className={`relative h-full w-full ${props.onOffsetChange ? PLACING_CLASSES : ""}`}>
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
        // touchAction none while placing: without it a drag on a phone is
        // taken as a page scroll and the sign never moves.
        style={{ background: "transparent", touchAction: props.onOffsetChange ? "none" : undefined }}
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
            luminanceThreshold={bloomThreshold}
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
  faceColor: faceColorProp,
  thickness,
  material,
  signType,
  lightMode,
  height,
  previewMode,
  offset,
  onOffsetChange,
  photoOffset,
  onPhotoOffsetChange,
  dragTarget = "sign",
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
  const faceColor = useMemo(
    () => new THREE.Color(safeColor(faceColorProp ?? letterColor)),
    [faceColorProp, letterColor],
  );
  const faceKind = faceKindFor(material, signType, lightMode);

  // Headroom is judged on what the sign actually shines in: white LEDs behind
  // a red face are a red light, and have to be kept from clipping to white
  // exactly like a red LED would.
  const shineColor = useMemo(
    () => emittedColor(glowColor, faceColor, faceKind, lightMode),
    [glowColor, faceColor, faceKind, lightMode],
  );
  const ls = getLightingSettings(signType, lightMode, isNight, shineColor);

  // Size is REAL now. The letters are scaled in LetterGeometryHost so their
  // capital is exactly as tall as ordered, measured in the same millimetres
  // as the brick wall behind them (components/three/scale.ts) — a 30 cm
  // letter spans a little over four 7 cm courses, a 5 cm one less than one.
  // Nothing is shrunk to fit any more: a long text or a big sign moves the
  // camera back instead (FramingRig below), so the size against the wall
  // stays true while the whole sign stays in view.
  const [signBounds, setSignBounds] = useState<{ width: number; height: number } | null>(null);

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
  const debouncedHeight    = useDebouncedValue(height, TEXT_DEBOUNCE_MS);
  // True depth: a 60 mm profile on a 300 mm letter is a fifth of its height.
  const worldDepth = Math.max(MIN_DEPTH_UNITS, mmToUnits(debouncedThickness));

  // Fallback (non-textured) material triple — also used directly for plexi/pvc,
  // and as the <LetterVariant> Suspense fallback while a textured material loads.
  const fallbackTriple = useMemo(
    () => buildMaterialTriple(matOpt, baseColor, glowColor, ls, isIlluminated, faceColor, faceKind),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [material, signType, lightColor, letterColor, faceColor, faceKind, ls.emissiveFront, ls.emissiveSide, ls.emissiveBack],
  );

  useEffect(() => {
    return () => disposeMaterialTriple(fallbackTriple);
  }, [fallbackTriple]);

  // Park the wall just behind the sign's back face. A back-lit letter stands
  // off the wall on spacers so the light has somewhere to spread; everything
  // else is mounted close.
  const standOffMm = isIlluminated && lightMode === "back" ? WALL_GAP_HALO_MM : WALL_GAP_MM;
  const wallZ = -worldDepth / 2 - mmToUnits(standOffMm);

  const { size: canvasSize } = useThree();
  const viewDistance = useMemo(() => {
    if (backgroundUrl || !signBounds) return NOMINAL_VIEW_DISTANCE;
    return framingDistance(signBounds, debouncedHeight, canvasSize.width / Math.max(1, canvasSize.height));
  }, [backgroundUrl, signBounds, debouncedHeight, canvasSize.width, canvasSize.height]);
  // How much further back than usual the camera stands — the key light and its
  // shadow have to cover a correspondingly bigger stretch of wall.
  // Not clamped at 1: for a small sign the shadow map is spent on a small
  // patch of wall and stays sharp instead of smearing over metres of brick.
  const reach = Math.max(0.2, viewDistance / NOMINAL_VIEW_DISTANCE);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    // r3f sets the shadow camera's bounds but does not rebuild its projection.
    keyLight.current?.shadow.camera.updateProjectionMatrix();
  }, [reach]);

  // While something in the preview can be dragged, the left button/one finger
  // belongs to it and turning the view moves to the right button/two fingers.
  const placing = !!onOffsetChange;
  const orbitMouseButtons = useMemo(
    () => (placing ? { RIGHT: THREE.MOUSE.ROTATE } : { LEFT: THREE.MOUSE.ROTATE }),
    [placing],
  );
  const orbitTouches = useMemo(
    () => (placing ? { TWO: THREE.TOUCH.ROTATE } : { ONE: THREE.TOUCH.ROTATE }),
    [placing],
  );

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

  // Only the back-lit build throws light onto the wall; an edge-lit letter
  // sends it sideways, away from the wall, and a front-lit one forward.
  const glowGain =
    lightMode === "back" ? HALO_GLOW_GAIN
    : lightMode === "edge" ? HALO_GLOW_GAIN_EDGE
    : HALO_GLOW_GAIN_FRONT;
  // Every lit mode at night now carries some glow, not just back-lit.
  const wallGlowOn = isIlluminated && isNight;

  return (
    <>
      {/* ── Lighting — even studio fill + one key light that throws the
          letters' shadow onto the wall behind them.

          The night figures were lifted (0.35 / 0.7 / 0.12 → below) for one
          reason: a customer who picks red has to SEE red, and at night the
          scene was so dim that every body colour collapsed into the same dark
          brown. None of this touches the LEDs — the glow is material
          emissive and bloom, which are left exactly as they were. ── */}
      <ambientLight intensity={isNight ? 0.62 : 0.82} />
      <directionalLight
        ref={keyLight}
        position={[3.2 * reach, 4.2 * reach, 3.5 * reach]}
        // At night the sign is the light. A strong key light then throws a
        // hard second silhouette of the letters onto the wall, which no photo
        // of a lit sign has — so it is kept to a gentle fill that still shows
        // the colour of the letters.
        intensity={isNight ? 0.55 : 1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        // Biases are distances, so they follow the scale of what is on screen
        // — a fixed one detaches a small letter's shadow from the letter.
        shadow-normalBias={0.02 * reach}
        shadow-camera-near={0.1 * reach}
        shadow-camera-far={26 * reach}
        shadow-camera-left={-6 * reach}
        shadow-camera-right={6 * reach}
        shadow-camera-top={6 * reach}
        shadow-camera-bottom={-6 * reach}
      />
      <directionalLight position={[-4, 1.5, 2.5]} intensity={isNight ? 0.3 : 0.6} />

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
        <mesh
          position={[photoOffset?.x ?? 0, photoOffset?.y ?? 0, wallZ + PHOTO_WALL_OFFSET]}
          receiveShadow
        >
          <planeGeometry args={photoSize} />
          <meshStandardMaterial
            map={photo.texture}
            color={isNight ? "#8f8f94" : "#ffffff"}
            roughness={1}
            metalness={0}
          />
        </mesh>
      )}

      {/* ── The sign and the glow it throws, as one movable thing ──────────
          Everything that IS the sign lives in this group: dragging it across
          the customer's photo has to take the wall glow and, through it, the
          shadow with it — a halo left behind where the letters used to be is
          the one thing that would give the composite away. ── */}
      <group position={[offset?.x ?? 0, offset?.y ?? 0, 0]}>

      {/* ── The glow the wall actually carries ── */}
      {wallGlowOn && (
        <Suspense fallback={null}>
          <HaloGlow
            fontFile={fontOpt.file}
            text={debouncedText}
            // The aura is light that got out of the sign, so it is the colour
            // it got out in: through a red face it is red. A halo's light goes
            // backwards and never passes the face — there it is the LED's.
            color={shineColor}
            gain={glowGain}
            heightMm={debouncedHeight}
            reachMm={lightMode === "back" ? HALO_REACH_MM : AURA_REACH_MM}
            y={0.08}
            z={wallZ + HALO_GLOW_WALL_OFFSET}
          />
        </Suspense>
      )}

      {/* ── Sign geometry — mounted flat on the wall; the viewer can drag
          within a limited arc (OrbitControls below) ── */}
      <Center position={[0, 0.08, 0]}>
        <group rotation={[VIEW_TILT, 0, 0]}>
          {/* Own Suspense boundary — switching fonts only hides the letters
              while their TTF loads, never the wall/lights/HDRI. */}
          <Suspense fallback={null}>
            <LetterGeometryHost
              fontFile={fontOpt.file}
              text={debouncedText}
              heightMm={debouncedHeight}
              worldDepth={worldDepth}
              material={material}
              matOpt={matOpt}
              baseColor={baseColor}
              glowColor={glowColor}
              ls={ls}
              isIlluminated={isIlluminated}
              faceColor={faceColor}
              faceKind={faceKind}
              fallbackTriple={fallbackTriple}
              onFailedGlyphs={onFailedGlyphs}
              onBounds={setSignBounds}
            />
          </Suspense>
        </group>
      </Center>

      </group>

      {/* ── Image-based lighting — own Suspense so the HDRI fetch doesn't block text ── */}
      <Suspense fallback={null}>
        <Environment
          files={ENV_HDR_PATH}
          background={false}
          environmentIntensity={isNight ? ENV_INTENSITY_NIGHT : ENV_INTENSITY}
        />
      </Suspense>

      {/* Drag to look around the sign — locked to a tasteful arc, no zoom/pan.
          On a photo the buttons split: the left one moves what the picker says
          (the sign, or the photo behind it), the right one still turns the view
          exactly as it does on a painted wall. Same on touch — one finger
          moves, two fingers turn — so nothing is out of reach on a phone. */}
      <FramingRig distance={viewDistance} />

      <OrbitControls
        makeDefault
        mouseButtons={orbitMouseButtons}
        touches={orbitTouches}
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

      {onOffsetChange && (
        <SignPlacement
          offset={offset ?? { x: 0, y: 0 }}
          onOffsetChange={onOffsetChange}
          photoOffset={photoOffset ?? { x: 0, y: 0 }}
          onPhotoOffsetChange={onPhotoOffsetChange}
          target={dragTarget}
          photoSize={photoSize}
        />
      )}
    </>
  );
}

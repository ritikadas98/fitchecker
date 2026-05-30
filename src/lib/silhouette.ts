/**
 * Silhouette renderer (v5) — single composite PNG per (gender × style),
 * with runtime canvas-based tinting and per-garment indicator metadata.
 *
 * Design:
 *   - Each composite is a fashion-croquis image: body and garment baked
 *     together into one PNG, garment in neutral white/grey, body in
 *     warm-skin tones, transparent background. (See public/garments/.)
 *   - Tint is applied at runtime by the consumer (TintedComposite) via
 *     Canvas2D pixel manipulation. Body pixels (warm-toned, non-neutral)
 *     are protected; only near-neutral garment pixels in the per-garment
 *     y-region get the tier color.
 *   - Per-garment metadata exposes:
 *       region:    y-range [0..1] within which to tint
 *       outline:   bbox [0..1] for the recommendation-tier outline rect
 *       pins:      named pin anchors (bust/waist/hip/length) per the
 *                  locked spec — count varies by style.
 *
 * Note on tunic: not shipped in v5. Falls back to top_regular asset and
 * pin layout. Fit math still distinguishes tunic length via baselines.
 */

import type { FitStatus, Gender, GarmentStyle, Recommendation, SizeFit } from "./types";

// === Canonical canvas (matches source asset aspect ratio) ================

/** Reference canvas size. All region/outline/pin coords are normalized 0..1
 *  against this; the consumer renders at whatever display size it chooses. */
export const CANVAS = { width: 1024, height: 1536 } as const;

// === Image asset registry ================================================
//
// The garment PNGs live in /public/garments/, which Vite copies to the dist
// root verbatim. At runtime the side panel resolves them via
// chrome.runtime.getURL("garments/<file>.png") → chrome-extension://<id>/garments/...
// We use chrome.runtime.getURL rather than `new URL(..., import.meta.url)`
// because the bundled side-panel chunk lives under /assets/, so a relative
// URL there resolves to /assets/../../public/... → wrong path; chrome's
// API gives us the extension-root base unambiguously.

const garmentUrl = (file: string): string => chrome.runtime.getURL(`garments/${file}`);

const ASSETS: Partial<Record<string, string>> = {
  // Female
  female_crop_top:    garmentUrl("female_crop_top.png"),
  female_top_regular: garmentUrl("female_top_regular.png"),
  female_kurta_short: garmentUrl("female_kurta_short.png"),
  female_kurta_long:  garmentUrl("female_kurta_long.png"),
  female_anarkali:    garmentUrl("female_anarkali.png"),
  female_dress_short: garmentUrl("female_dress_short.png"),
  female_dress_long:  garmentUrl("female_dress_long.png"),
  female_trousers:    garmentUrl("female_trousers.png"),
  female_jeans:       garmentUrl("female_jeans.png"),
  female_shorts:      garmentUrl("female_shorts.png"),
  female_skirt:       garmentUrl("female_skirt.png"),
  // Male
  male_top_regular:   garmentUrl("male_top_regular.png"),
  male_kurta_short:   garmentUrl("male_kurta_short.png"),
  male_kurta_long:    garmentUrl("male_kurta_long.png"),
  male_trousers:      garmentUrl("male_trousers.png"),
  male_jeans:         garmentUrl("male_jeans.png"),
  male_shorts:        garmentUrl("male_shorts.png"),
};

/**
 * Resolve a (style, gender) → asset key, applying graceful fallbacks for
 * styles we don't ship art for in v5 (tunic, unknown_*).
 */
function resolveAssetStyle(style: GarmentStyle, gender: Gender): GarmentStyle | null {
  if (ASSETS[`${gender}_${style}`]) return style;

  // Fallbacks.
  if (style === "tunic" || style === "unknown_top") return "top_regular";
  if (style === "unknown_dress") return "dress_short";
  if (style === "unknown_bottom") return "trousers";

  // Female-only styles asked for as male, or vice versa: nearest equivalent.
  if (gender === "male") {
    if (style === "crop_top") return "top_regular";
    if (style === "anarkali") return "kurta_long";
    if (style === "dress_short" || style === "dress_long") return "kurta_long";
    if (style === "skirt") return "trousers";
  }
  return null;
}

function assetUrlFor(style: GarmentStyle, gender: Gender): string | null {
  const resolved = resolveAssetStyle(style, gender);
  if (!resolved) return null;
  return ASSETS[`${gender}_${resolved}`] ?? null;
}

// === Per-garment metadata ================================================
//
// Coordinates are normalized [0..1] against the canonical 1024×1536 canvas.

export interface BBox { x0: number; y0: number; x1: number; y1: number; }

export type PinKey = "bust" | "waist" | "hip" | "length";

/** A pin anchor: which axis and where on the canvas. */
export interface PinAnchor {
  key: PinKey;
  /** Position in normalized canvas coords [0..1]. */
  x: number;
  y: number;
}

/**
 * For each garment style we ship art for, define:
 *   - region:  vertical band that contains the garment fabric (used by tint)
 *   - outline: rectangle to draw the recommendation outline around
 *   - pins:    ordered axes shown as pins on this style
 *
 * Pin counts per the locked spec:
 *   crop_top / top_regular / kurta_short / dress_short    → bust + waist + length         (3)
 *   kurta_long / dress_long                                → bust + waist + hip + length   (4)
 *   anarkali                                               → bust + length                 (2)
 *   trousers / jeans / shorts / skirt                      → waist + hip + length          (3)
 *
 * Values eyeballed from the rendered catalog and validated against the
 * processed PNG bboxes; all in normalized canvas units.
 */
export interface GarmentMeta {
  region: { y0: number; y1: number };
  outline: BBox;
  pins: PinAnchor[];
}

type StyleKey =
  | "crop_top" | "top_regular" | "kurta_short" | "kurta_long" | "anarkali"
  | "dress_short" | "dress_long"
  | "trousers" | "jeans" | "shorts" | "skirt";

// Pins are placed near the right-hand edge of the garment so tags expanding
// inward (Option A: leftward) appear over the silhouette and never clip.
const FEMALE_META: Record<StyleKey, GarmentMeta> = {
  crop_top: {
    region:  { y0: 0.20, y1: 0.39 },
    outline: { x0: 0.34, y0: 0.20, x1: 0.66, y1: 0.39 },
    pins: [
      { key: "bust",   x: 0.69, y: 0.27 },
      { key: "waist",  x: 0.65, y: 0.36 },
      { key: "length", x: 0.65, y: 0.40 },
    ],
  },
  top_regular: {
    region:  { y0: 0.20, y1: 0.55 },
    outline: { x0: 0.32, y0: 0.20, x1: 0.68, y1: 0.55 },
    pins: [
      { key: "bust",   x: 0.71, y: 0.27 },
      { key: "waist",  x: 0.66, y: 0.40 },
      { key: "length", x: 0.69, y: 0.54 },
    ],
  },
  kurta_short: {
    region:  { y0: 0.20, y1: 0.70 },
    outline: { x0: 0.30, y0: 0.20, x1: 0.70, y1: 0.70 },
    pins: [
      { key: "bust",   x: 0.71, y: 0.27 },
      { key: "waist",  x: 0.68, y: 0.40 },
      { key: "length", x: 0.71, y: 0.69 },
    ],
  },
  kurta_long: {
    region:  { y0: 0.20, y1: 0.83 },
    outline: { x0: 0.29, y0: 0.20, x1: 0.71, y1: 0.83 },
    pins: [
      { key: "bust",   x: 0.71, y: 0.27 },
      { key: "waist",  x: 0.68, y: 0.40 },
      { key: "hip",    x: 0.69, y: 0.48 },
      { key: "length", x: 0.71, y: 0.82 },
    ],
  },
  anarkali: {
    region:  { y0: 0.20, y1: 0.93 },
    outline: { x0: 0.22, y0: 0.20, x1: 0.78, y1: 0.93 },
    pins: [
      { key: "bust",   x: 0.71, y: 0.27 },
      { key: "length", x: 0.78, y: 0.92 },
    ],
  },
  dress_short: {
    region:  { y0: 0.18, y1: 0.70 },
    outline: { x0: 0.32, y0: 0.18, x1: 0.68, y1: 0.70 },
    pins: [
      { key: "bust",   x: 0.69, y: 0.25 },
      { key: "waist",  x: 0.66, y: 0.40 },
      { key: "length", x: 0.70, y: 0.69 },
    ],
  },
  dress_long: {
    region:  { y0: 0.18, y1: 0.93 },
    outline: { x0: 0.26, y0: 0.18, x1: 0.74, y1: 0.93 },
    pins: [
      { key: "bust",   x: 0.69, y: 0.25 },
      { key: "waist",  x: 0.65, y: 0.40 },
      { key: "hip",    x: 0.69, y: 0.48 },
      { key: "length", x: 0.74, y: 0.92 },
    ],
  },
  trousers: {
    region:  { y0: 0.42, y1: 0.93 },
    outline: { x0: 0.32, y0: 0.42, x1: 0.68, y1: 0.93 },
    pins: [
      { key: "waist",  x: 0.65, y: 0.43 },
      { key: "hip",    x: 0.66, y: 0.52 },
      { key: "length", x: 0.65, y: 0.92 },
    ],
  },
  jeans: {
    region:  { y0: 0.42, y1: 0.93 },
    outline: { x0: 0.33, y0: 0.42, x1: 0.67, y1: 0.93 },
    pins: [
      { key: "waist",  x: 0.65, y: 0.43 },
      { key: "hip",    x: 0.66, y: 0.52 },
      { key: "length", x: 0.65, y: 0.92 },
    ],
  },
  shorts: {
    region:  { y0: 0.42, y1: 0.62 },
    outline: { x0: 0.33, y0: 0.42, x1: 0.67, y1: 0.62 },
    pins: [
      { key: "waist",  x: 0.65, y: 0.43 },
      { key: "hip",    x: 0.66, y: 0.52 },
      { key: "length", x: 0.66, y: 0.61 },
    ],
  },
  skirt: {
    region:  { y0: 0.42, y1: 0.62 },
    outline: { x0: 0.32, y0: 0.42, x1: 0.68, y1: 0.62 },
    pins: [
      { key: "waist",  x: 0.65, y: 0.43 },
      { key: "hip",    x: 0.67, y: 0.52 },
      { key: "length", x: 0.69, y: 0.61 },
    ],
  },
};

const MALE_META: Record<StyleKey, GarmentMeta> = {
  crop_top: FEMALE_META.crop_top,        // unused (men's crop_top falls back to top_regular)
  top_regular: {
    region:  { y0: 0.18, y1: 0.55 },
    outline: { x0: 0.31, y0: 0.18, x1: 0.69, y1: 0.55 },
    pins: [
      { key: "bust",   x: 0.71, y: 0.26 },
      { key: "waist",  x: 0.69, y: 0.40 },
      { key: "length", x: 0.71, y: 0.54 },
    ],
  },
  kurta_short: {
    region:  { y0: 0.16, y1: 0.65 },
    outline: { x0: 0.29, y0: 0.16, x1: 0.71, y1: 0.65 },
    pins: [
      { key: "bust",   x: 0.71, y: 0.26 },
      { key: "waist",  x: 0.69, y: 0.40 },
      { key: "length", x: 0.72, y: 0.64 },
    ],
  },
  kurta_long: {
    region:  { y0: 0.16, y1: 0.78 },
    outline: { x0: 0.28, y0: 0.16, x1: 0.72, y1: 0.78 },
    pins: [
      { key: "bust",   x: 0.71, y: 0.26 },
      { key: "waist",  x: 0.69, y: 0.40 },
      { key: "hip",    x: 0.71, y: 0.48 },
      { key: "length", x: 0.73, y: 0.77 },
    ],
  },
  anarkali: FEMALE_META.kurta_long,   // unused
  dress_short: FEMALE_META.dress_short, // unused
  dress_long: FEMALE_META.dress_long,   // unused
  trousers: {
    region:  { y0: 0.40, y1: 0.94 },
    outline: { x0: 0.32, y0: 0.40, x1: 0.68, y1: 0.94 },
    pins: [
      { key: "waist",  x: 0.66, y: 0.41 },
      { key: "hip",    x: 0.67, y: 0.51 },
      { key: "length", x: 0.66, y: 0.93 },
    ],
  },
  jeans: {
    region:  { y0: 0.40, y1: 0.94 },
    outline: { x0: 0.33, y0: 0.40, x1: 0.67, y1: 0.94 },
    pins: [
      { key: "waist",  x: 0.66, y: 0.41 },
      { key: "hip",    x: 0.67, y: 0.51 },
      { key: "length", x: 0.66, y: 0.93 },
    ],
  },
  shorts: {
    region:  { y0: 0.40, y1: 0.62 },
    outline: { x0: 0.33, y0: 0.40, x1: 0.67, y1: 0.62 },
    pins: [
      { key: "waist",  x: 0.66, y: 0.41 },
      { key: "hip",    x: 0.67, y: 0.51 },
      { key: "length", x: 0.66, y: 0.61 },
    ],
  },
  skirt: FEMALE_META.skirt, // unused
};

function getGarmentMeta(style: GarmentStyle, gender: Gender): GarmentMeta | null {
  const resolved = resolveAssetStyle(style, gender);
  if (!resolved) return null;
  const table = gender === "female" ? FEMALE_META : MALE_META;
  return table[resolved as StyleKey] ?? null;
}

// === Tint colors per recommendation tier ================================
//
// Tailwind 500-level so they read crisply at small sizes. The TintedComposite
// component reads these via the recommendation tier.

export const TIER_COLORS: Record<Recommendation, { tint: [number, number, number]; outline: string }> = {
  recommended:     { tint: [34, 197, 94],  outline: "#16a34a" }, // green
  may_work:        { tint: [245, 158, 11], outline: "#d97706" }, // amber
  not_recommended: { tint: [239, 68, 68],  outline: "#dc2626" }, // red
};

// === Width-fit horizontal scale =========================================

/** Convert width-axis diff in inches into a horizontal scale factor.
 *  Subtle: ±3% per spec. Verdict text carries the precision. */
function widthScaleFor(diffInches: number | undefined): number {
  if (diffInches === undefined) return 1.0;
  const clamped = Math.max(-3, Math.min(3, diffInches));
  return 1.0 + clamped * 0.01;
}

// === Pin status mapping =================================================

export type PinIcon = "check" | "tight" | "loose" | "short" | "long" | "unknown";
export type PinTone = "good" | "warn" | "bad" | "neutral";

export interface PinState {
  key: PinKey;
  icon: PinIcon;
  tone: PinTone;
  /** Short label shown when the pin expands to a tag. */
  tagText: string;
  /** Pin position (carried through from GarmentMeta for convenience). */
  x: number;
  y: number;
}

function toneFromStatus(status: FitStatus): PinTone {
  if (status === "unknown") return "neutral";
  if (status === "perfect" || status === "good") return "good";
  if (status === "okay") return "warn";
  return "bad";
}

function iconFor(key: PinKey, status: FitStatus, diff: number): PinIcon {
  if (status === "unknown") return "unknown";
  if (status === "perfect" || status === "good") return "check";
  if (key === "length") return diff < 0 ? "short" : "long";
  return diff < 0 ? "tight" : "loose";
}

function tagTextFor(key: PinKey, status: FitStatus, diff: number): string {
  const axisLabel = key === "length" ? "Length" : key.charAt(0).toUpperCase() + key.slice(1);
  if (status === "unknown") return `${axisLabel} info unavailable`;
  if (status === "perfect" || status === "good") return `${axisLabel} fits`;
  const dir = key === "length"
    ? diff < 0 ? "short" : "long"
    : diff < 0 ? "snug"  : "loose";
  const inches = Math.abs(diff);
  // Sanity guard: diffs over 30" almost certainly come from a measurement
  // extraction error (e.g. cm interpreted as inches, or a price scraped as
  // a measurement). Don't show a misleading number — flag the issue instead.
  if (inches > 30) return `${axisLabel} ${dir} (size data unclear)`;
  const inchesStr = inches < 0.5 ? "" : ` by ${inches.toFixed(1)}"`;
  return `${axisLabel} ${dir}${inchesStr}`;
}

/** Map a SizeFit into ordered PinStates, in the order this garment shows them. */
export function pinStatesFor(style: GarmentStyle, gender: Gender, fit: SizeFit): PinState[] {
  const meta = getGarmentMeta(style, gender);
  if (!meta) return [];

  return meta.pins.map((anchor): PinState => {
    const axisFromFit =
      anchor.key === "length" ? fit.length :
      anchor.key === "bust"   ? (fit.bust  ?? fit.width) :
      anchor.key === "waist"  ? (fit.waist ?? fit.width) :
      anchor.key === "hip"    ? (fit.hip   ?? fit.width) :
      undefined;

    if (!axisFromFit) {
      // No verdict for this axis (e.g. dress with missing hip data, top
      // with no length on the page). Don't fake a green check — emit a
      // neutral "unknown" pin so the silhouette matches the analysis copy
      // below it ("Length info unavailable" etc.).
      const label =
        anchor.key === "length"
          ? "Length"
          : anchor.key.charAt(0).toUpperCase() + anchor.key.slice(1);
      return {
        key: anchor.key,
        icon: "unknown",
        tone: "neutral",
        tagText: `${label} info unavailable`,
        x: anchor.x,
        y: anchor.y,
      };
    }

    return {
      key: anchor.key,
      icon: iconFor(anchor.key, axisFromFit.status, axisFromFit.diff),
      tone: toneFromStatus(axisFromFit.status),
      tagText: tagTextFor(anchor.key, axisFromFit.status, axisFromFit.diff),
      x: anchor.x,
      y: anchor.y,
    };
  });
}

// === Public API =========================================================

export interface SilhouetteData {
  /** URL of the composite PNG to draw. null = no asset for this combo. */
  imageUrl: string | null;
  /** Per-garment metadata: tint region, outline rect, pin anchors. null if no asset. */
  meta: GarmentMeta | null;
  /** Pin states (icon + tone + tag) ordered as in meta.pins. */
  pins: PinState[];
  /** Tier colors + outline color for the recommendation. */
  tier: { tint: [number, number, number]; outline: string };
  /** Horizontal scale for width-fit visualization (subtle ±3%). */
  widthScale: number;
  /** Canonical canvas dimensions (so consumers can layer absolute coords). */
  canvas: { width: number; height: number };
}

interface RenderInput {
  gender: Gender;
  fit: SizeFit;
  garmentStyle: GarmentStyle;
}

export function buildSilhouette(input: RenderInput): SilhouetteData {
  const { gender, fit, garmentStyle } = input;
  const imageUrl = assetUrlFor(garmentStyle, gender);
  const meta = getGarmentMeta(garmentStyle, gender);
  const pins = pinStatesFor(garmentStyle, gender, fit);
  const tier = TIER_COLORS[fit.recommendation];

  const primaryWidthDiff = fit.hip?.diff ?? fit.bust?.diff ?? fit.width?.diff ?? 0;
  const widthScale = widthScaleFor(primaryWidthDiff);

  return {
    imageUrl,
    meta,
    pins,
    tier,
    widthScale,
    canvas: { ...CANVAS },
  };
}

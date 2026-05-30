/**
 * Canvas-based runtime tint (v3 — inverse-skin mask).
 *
 * Reads a composite PNG (body+garment baked, neutral grey garment, warm-skin
 * body, transparent bg) and replaces non-skin pixels in a vertical region
 * with a target color, scaled by per-pixel luminance to preserve fabric
 * shading.
 *
 * Mask logic (each pixel must satisfy all to be tinted):
 *   - alpha > 30                                 → must be visible
 *   - lum > 80 AND lum < 252                     → skip dark line work and pure highlights
 *   - NOT (R >= G >= B AND R - B >= 8)           → skip skin (warm tone, R≫B)
 *
 * The skin test was tuned against pixel sampling: real skin has R-B ≈ 12-19,
 * so 8 catches it cleanly. Some garment art with deliberate warm undertones
 * (e.g. crop tops drawn with see-through body shading) will look like skin
 * to this test and pass through un-tinted; that's an inherent limitation of
 * those particular source assets.
 */

const SKIN_R_B_DIFF = 8;
const LUM_MIN = 80;
const LUM_MAX = 252;
const ALPHA_MIN = 30;
const TINT_LUM_SCALE = 0.92;
const TINT_LUM_FLOOR = 18;

export interface TintRegion {
  y0: number; // 0..1
  y1: number; // 0..1
}

/**
 * Apply tint in-place to the canvas. Caller is responsible for drawing
 * the source image to the canvas first.
 */
export function applyTint(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  tintColor: [number, number, number],
  region: TintRegion,
): void {
  const yStart = Math.max(0, Math.floor(region.y0 * canvasHeight));
  const yEnd = Math.min(canvasHeight, Math.ceil(region.y1 * canvasHeight));
  if (yEnd <= yStart) return;

  const bandHeight = yEnd - yStart;
  const imageData = ctx.getImageData(0, yStart, canvasWidth, bandHeight);
  const data = imageData.data;
  const [tr, tg, tb] = tintColor;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < ALPHA_MIN) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Skin test: warm gradient (R >= G >= B) with significant R-B spread.
    if (r >= g && g >= b && (r - b) >= SKIN_R_B_DIFF) continue;

    // Luminance window: skip dark line work and pure highlights.
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum <= LUM_MIN || lum >= LUM_MAX) continue;

    // Tint = target color * normalized luminance, with a floor so dark
    // shadows still carry hue.
    const norm = lum / 255;
    data[i]     = Math.min(255, tr * norm * TINT_LUM_SCALE + TINT_LUM_FLOOR);
    data[i + 1] = Math.min(255, tg * norm * TINT_LUM_SCALE + TINT_LUM_FLOOR);
    data[i + 2] = Math.min(255, tb * norm * TINT_LUM_SCALE + TINT_LUM_FLOOR);
  }

  ctx.putImageData(imageData, 0, yStart);
}

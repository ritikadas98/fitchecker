/**
 * TintedComposite — renders a composite croquis PNG with a runtime tint
 * applied to the garment region, plus an outline rectangle around the
 * garment bounding box in the recommendation-tier color.
 *
 * Steps on each render:
 *   1. Load image (cached by the browser — Vite-bundled URL).
 *   2. Draw to an offscreen canvas at display size.
 *   3. Apply tint to pixels inside the garment region.
 *   4. Draw the outline rectangle on top.
 *   5. Surface the canvas as a child of an absolutely-positioned wrapper
 *      so FitIndicators can layer pins on top of the same coordinate space.
 */
import { useEffect, useRef } from "react";
import { applyTint } from "../../lib/tint";
import type { GarmentMeta } from "../../lib/silhouette";

interface Props {
  imageUrl: string;
  meta: GarmentMeta;
  /** [r, g, b], 0..255 */
  tintColor: [number, number, number];
  /** CSS color (e.g. "#16a34a") */
  outlineColor: string;
  /** Horizontal scale to apply (subtle width-fit cue). */
  widthScale: number;
  /** Display size in CSS px. */
  width: number;
  height: number;
}

export function TintedComposite({
  imageUrl,
  meta,
  tintColor,
  outlineColor,
  widthScale,
  width,
  height,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const pxW = Math.round(width * dpr);
    const pxH = Math.round(height * dpr);
    canvas.width = pxW;
    canvas.height = pxH;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let cancelled = false;

    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (cancelled) return;

      // Clear in case of re-render race.
      ctx.clearRect(0, 0, pxW, pxH);

      // Draw composite at full canvas size (preserves aspect since the
      // source asset's aspect equals canvas width/height ratio).
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, pxW, pxH);

      // Apply tint inside the garment region.
      applyTint(ctx, pxW, pxH, tintColor, meta.region);

      // Draw outline — rectangular bbox around the garment, slight rounding
      // and inset to avoid the canvas edge clipping the stroke.
      const bx0 = meta.outline.x0 * pxW;
      const by0 = meta.outline.y0 * pxH;
      const bx1 = meta.outline.x1 * pxW;
      const by1 = meta.outline.y1 * pxH;
      const stroke = 3 * dpr;
      ctx.lineWidth = stroke;
      ctx.strokeStyle = outlineColor;
      ctx.lineJoin = "round";
      const radius = 8 * dpr;
      const x = bx0, y = by0, w = bx1 - bx0, h = by1 - by0;
      ctx.beginPath();
      // Manual rounded rect (Canvas2D roundRect isn't universally available
      // in Chromium versions older than 99, but we target current Chrome).
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.stroke();
    };
    img.onerror = () => {
      // Asset missing — leave canvas empty. The FitVerdict UI degrades to
      // "no silhouette" and analysis text still renders.
      console.warn("TintedComposite: failed to load", imageUrl);
    };
    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl, meta, tintColor, outlineColor, width, height]);

  // Width scale is applied as a CSS transform so it stays vector-crisp and
  // doesn't fight the canvas pixel grid.
  const transform = `scaleX(${widthScale})`;

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform,
        transformOrigin: "center center",
        display: "block",
      }}
      aria-hidden
    />
  );
}

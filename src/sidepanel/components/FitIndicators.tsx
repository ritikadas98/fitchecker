/**
 * FitIndicators — pin badges layered over the silhouette.
 *
 * Each pin is a small circular badge anchored to a normalized (x, y) on the
 * canvas. The pin expands into a tag that grows leftward from the pin
 * (Option A — inward into the silhouette area, away from the panel edge).
 *
 * Visibility model: ONE tag at a time, controlled by a single React state
 * (`activePin`). Both mouseEnter/Leave and focus/blur drive that state, so
 * a pin clicked-into-focus can't stay open while another is hovered.
 */
import { useState } from "react";
import type { PinState } from "../../lib/silhouette";

interface Props {
  pins: PinState[];
  /** Display dimensions of the silhouette area (CSS px). Pins use these to
   *  resolve normalized positions into absolute coordinates. */
  width: number;
  height: number;
}

const ICON_MAP: Record<PinState["icon"], string> = {
  check: "✓",
  tight: "→←", // arrows pointing inward = snug
  loose: "←→", // arrows pointing outward = loose
  short: "↑",  // hem rises
  long:  "↓",  // hem falls
  unknown: "?", // data missing
};

export function FitIndicators({ pins, width, height }: Props) {
  // Single source of truth for which pin's tag is visible. Hover OR focus
  // sets it; leaving / blurring clears it.
  const [activePin, setActivePin] = useState<string | null>(null);

  return (
    <div
      className="fit-indicators"
      style={{ width, height }}
      aria-label="Per-axis fit indicators"
    >
      {pins.map((pin, i) => {
        const left = pin.x * width;
        const top = pin.y * height;
        const id = keyOf(pin, i);
        const isOpen = activePin === id;
        return (
          <div
            key={id}
            className={`fit-pin-anchor fit-pin-${pin.tone}${isOpen ? " open" : ""}`}
            style={{ left, top }}
            onMouseEnter={() => setActivePin(id)}
            onMouseLeave={() => setActivePin((cur) => (cur === id ? null : cur))}
            onFocus={() => setActivePin(id)}
            onBlur={() => setActivePin((cur) => (cur === id ? null : cur))}
            tabIndex={0}
            role="button"
            aria-label={pin.tagText}
          >
            {/* Tag (positioned to the LEFT of the pin, expanding inward) */}
            <div className="fit-pin-tag" aria-hidden={!isOpen}>
              <span className="fit-pin-tag-icon">{ICON_MAP[pin.icon]}</span>
              <span className="fit-pin-tag-text">{pin.tagText}</span>
            </div>
            {/* Pin itself */}
            <div className="fit-pin-dot" aria-hidden>
              <span className="fit-pin-icon">{ICON_MAP[pin.icon]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function keyOf(pin: PinState, idx: number): string {
  return `${pin.key}-${idx}`;
}

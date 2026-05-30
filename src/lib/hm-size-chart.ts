/**
 * H&M India size chart — static body measurement tables.
 *
 * Why this file exists:
 *   H&M India does not expose per-product body measurements in the page
 *   hydration the way Myntra and Ajio do. The size guide modal is loaded
 *   lazily from api.hm.com after page render, which our content-script-only
 *   adapter cannot fetch. We work around this by shipping H&M's published
 *   standardized size chart as static data, keyed by gender + category +
 *   size name.
 *
 *   This is not as fidelity-preserving as Myntra/Ajio (where each product
 *   can have a slightly different chart), but H&M's published chart has
 *   been stable for years and applies uniformly to ladies/men's lines.
 *
 * Source: H&M India size guide modal, captured 2026-05-09 from
 *   www2.hm.com/en_in. Three charts: tops/blouses, skirts/trousers,
 *   dresses/jumpsuits. Tops and dresses share identical chest/waist/hip
 *   bands; only inside leg length differs (which we don't use directly —
 *   garment length comes from productAttributes.measurement instead).
 *
 * Values: midpoints of the published inch range per band, rounded to
 *   0.25 inch. We use midpoints because:
 *     - the band IS the size's tolerance, not a hard boundary
 *     - the fit-math layer's existing thresholds handle "user sits at
 *       the edge" by tagging snug or loose
 *     - using the min would over-tag perfect fits as "snug", using max
 *       would do the opposite
 *
 * Size label conventions on H&M India PDPs (verified against
 *   variations[*].sizes[*].name):
 *     - Women's tops, blouses, dresses, jumpsuits: letters XXS..4XL
 *     - Women's bottoms (skirts, trousers, jeans, shorts): UK numbers
 *       4..22 (NOT EUR — though we accept EUR as alias just in case)
 *     - Men's tops: letters XXS..3XL
 *     - Men's bottoms (jeans, trousers): W/L format "28/30" where the
 *       digits ARE the actual waist and inseam in inches. We parse this
 *       directly rather than chart-lookup.
 *
 * Missing dimensions:
 *     - Men's tops: no hip column (chest + waist only)
 *     - Men's bottoms (W/L parsed): hip is approximated as waist + 8"
 *       since H&M doesn't publish a hip mapping for the W/L grid
 *     - Women's tops: hip is included
 *     - Tops in general: no garment length (extracted separately from
 *       productAttributes.measurement when available)
 *     - Bottoms: inseam is included as the "length" axis
 */

export interface BodyMeasurement {
  /** Bust for women, chest for men. */
  bust?: number;
  waist?: number;
  hip?: number;
  /** Inseam for bottoms; absent on tops; absent on dresses (dress garment
   *  length comes from productAttributes.measurement instead). */
  length?: number;
}

/** Women's tops and dresses share this body chart (XXS through 4XL). */
const WOMEN_LETTER: Record<string, BodyMeasurement> = {
  XXS:   { bust: 30.0,  waist: 24.75, hip: 31.75 },
  XS:    { bust: 31.5,  waist: 25.5,  hip: 33.5  },
  S:     { bust: 33.75, waist: 27.5,  hip: 35.75 },
  M:     { bust: 37.0,  waist: 30.75, hip: 38.5  },
  L:     { bust: 40.25, waist: 34.5,  hip: 41.0  },
  XL:    { bust: 44.5,  waist: 39.0,  hip: 44.25 },
  XXL:   { bust: 49.0,  waist: 43.75, hip: 48.5  },
  "3XL": { bust: 53.75, waist: 49.0,  hip: 52.75 },
  "4XL": { bust: 58.5,  waist: 54.5,  hip: 57.5  },
};

/**
 * Women's bottoms — skirts and trousers. H&M India PDPs label these
 * with UK numbers (4, 6, 8, ..., 22) as the actual variant.name. We
 * key the chart by UK number directly. EUR aliases (32-62) live in a
 * separate map below — useful if a PDP ever ships EUR labels.
 */
const WOMEN_BOTTOMS_UK: Record<string, BodyMeasurement> = {
  "4":  { waist: 24.75, hip: 31.75, length: 28.0  },
  "6":  { waist: 25.5,  hip: 33.5,  length: 28.25 },
  "8":  { waist: 26.75, hip: 35.0,  length: 28.5  },
  "10": { waist: 28.25, hip: 36.5,  length: 28.75 },
  "12": { waist: 29.75, hip: 37.75, length: 28.75 },
  "14": { waist: 31.5,  hip: 39.0,  length: 28.5  },
  "16": { waist: 33.5,  hip: 40.0,  length: 28.5  },
  "18": { waist: 35.5,  hip: 41.5,  length: 28.25 },
  "20": { waist: 37.75, hip: 43.25, length: 28.25 },
  "22": { waist: 40.25, hip: 45.25, length: 28.25 },
  "24": { waist: 42.5,  hip: 47.25, length: 28.25 },
  "26": { waist: 45.0,  hip: 49.5,  length: 28.25 },
  "28": { waist: 47.75, hip: 51.75, length: 28.0  },
  "30": { waist: 50.5,  hip: 54.0,  length: 28.0  },
  "32": { waist: 53.0,  hip: 56.25, length: 28.0  },
  "34": { waist: 55.75, hip: 58.75, length: 28.0  },
};

/**
 * EUR → UK alias for women's bottoms. Lookup falls back through this
 * if a numeric size doesn't hit WOMEN_BOTTOMS_UK directly.
 */
const EUR_TO_UK_WOMEN: Record<string, string> = {
  "32": "4",  "34": "6",  "36": "8",  "38": "10", "40": "12", "42": "14",
  "44": "16", "46": "18", "48": "20", "50": "22", "52": "24", "54": "26",
  "56": "28", "58": "30", "60": "32", "62": "34",
};

/**
 * Letter → UK alias for women's bottoms. Some H&M trouser PDPs ship
 * letter-sized variants (XXS, XS, S, M, L, XL) instead of UK numbers.
 * H&M's published mapping pairs letters with UK numeric ranges:
 *   XXS-S range: XXS=4, XS=6, S=8-10
 *   M-XL range:  M=10-12, L=14, XL=16
 *   XXL-3XL:     XXL=18-20, 3XL=22-24
 * Where a range is shown, we use the midpoint variant.
 */
const LETTER_TO_UK_WOMEN: Record<string, string> = {
  "XXS": "4",
  "XS":  "6",
  "S":   "8",
  "M":   "12",
  "L":   "14",
  "XL":  "16",
  "XXL": "18",
  "3XL": "22",
  "4XL": "24",
};

/** Men's tops — chest + waist only. No hip in H&M's men's tops chart. */
const MEN_TOPS: Record<string, BodyMeasurement> = {
  XXS:   { bust: 29.75, waist: 25.25 },
  XS:    { bust: 32.25, waist: 27.5  },
  S:     { bust: 34.75, waist: 29.75 },
  M:     { bust: 37.75, waist: 33.0  },
  L:     { bust: 41.0,  waist: 36.25 },
  XL:    { bust: 44.0,  waist: 39.75 },
  XXL:   { bust: 47.25, waist: 43.25 },
  "3XL": { bust: 50.5,  waist: 46.75 },
};

/** Men's bottoms — waist + hip + inseam. */
const MEN_BOTTOMS: Record<string, BodyMeasurement> = {
  XXS:   { waist: 25.25, hip: 33.0,  length: 30.0  },
  XS:    { waist: 27.5,  hip: 34.75, length: 30.25 },
  S:     { waist: 30.0,  hip: 37.25, length: 30.75 },
  M:     { waist: 33.0,  hip: 39.5,  length: 31.0  },
  L:     { waist: 36.25, hip: 42.0,  length: 31.5  },
  XL:    { waist: 39.75, hip: 44.25, length: 31.75 },
  XXL:   { waist: 43.25, hip: 46.75, length: 32.0  },
  "3XL": { waist: 46.75, hip: 49.0,  length: 32.0  },
};

/**
 * Look up body measurements for a given size name on H&M India.
 *
 * The size label format on PDPs varies by gender + category:
 *   - Women's tops/dresses:  letters (XXS, XS, S, ..., 4XL)
 *   - Women's bottoms:       UK numbers ("4", "6", "8", ..., "22"),
 *                             occasionally EUR ("32", "34", ...)
 *   - Men's tops:            letters (XXS, ..., 3XL)
 *   - Men's bottoms:         W/L format ("28/30", "29/30", ..., "38/30")
 *                             where the digits before "/" ARE the actual
 *                             waist in inches and after "/" is inseam in
 *                             inches. We parse them directly — no chart
 *                             lookup required for waist/length, only an
 *                             approximation for hip.
 *
 * Returns null if the size isn't in any chart, signalling to the caller
 * that the variant should be passed through with empty measurements
 * (graceful degradation).
 */
export function lookupHmMeasurements(
  gender: "male" | "female",
  category: "top" | "bottom" | "dress",
  sizeName: string
): BodyMeasurement | null {
  const trimmed = sizeName.trim();
  const upper = trimmed.toUpperCase();

  if (gender === "male" && category === "bottom") {
    // W/L direct parse: "28/30" → waist=28, inseam=30, hip≈waist+8.
    const wl = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (wl) {
      const waist = parseFloat(wl[1]);
      const inseam = parseFloat(wl[2]);
      if (!isNaN(waist) && !isNaN(inseam)) {
        return { waist, hip: waist + 8, length: inseam };
      }
    }
    // Fallback for legacy letter-sized inventory.
    return MEN_BOTTOMS[upper] ?? null;
  }

  if (gender === "female" && category === "bottom") {
    // Try UK number, then EUR alias, then letter alias. H&M ships at
    // least three labeling conventions for women's bottoms:
    //   - UK numbers (4, 6, ..., 22) — most common
    //   - EUR numbers (32-62) — occasional
    //   - Letters (XXS-4XL) — drawstring/elastic-waist styles often
    const numKey = upper.replace(/\D/g, "");
    if (numKey && WOMEN_BOTTOMS_UK[numKey]) return WOMEN_BOTTOMS_UK[numKey];
    if (numKey && EUR_TO_UK_WOMEN[numKey]) {
      return WOMEN_BOTTOMS_UK[EUR_TO_UK_WOMEN[numKey]] ?? null;
    }
    if (LETTER_TO_UK_WOMEN[upper]) {
      return WOMEN_BOTTOMS_UK[LETTER_TO_UK_WOMEN[upper]] ?? null;
    }
    return null;
  }

  // Tops + dresses: letter-only.
  if (gender === "female") return WOMEN_LETTER[upper] ?? null;
  return MEN_TOPS[upper] ?? null;
}

/**
 * Whether we have any chart coverage at all for the given gender+category.
 * Used by the adapter to decide between "size data unclear" (we have a
 * chart but this size is missing — could be a one-off odd label) vs
 * "unsupported" (we never had a chart for this combination).
 */
export function hasChartFor(
  gender: "male" | "female",
  category: "top" | "bottom" | "dress"
): boolean {
  if (gender === "male" && category === "dress") return false; // H&M men don't have dresses
  return true;
}

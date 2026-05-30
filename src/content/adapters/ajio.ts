/**
 * AJIO ADAPTER — handles tops, bottoms, and dresses.
 *
 * URL pattern: hostname ends with ajio.com, path matches /p/<digits>
 *   /fig-women-floral-print-a-line-dress/p/443107430_offwhite
 *
 * Hydration data location: `window.__PRELOADED_STATE__`, written into an
 * inline <script> tag near the bottom of the page. Same brace-counting
 * extraction technique used for Myntra (shared util).
 *
 * Within the hydration object, the paths of interest are:
 *   product.productDetails  — identity / variants / classification
 *   product.sizeData        — size chart (sibling of productDetails)
 *
 * Key fields used from productDetails:
 *   .baseProduct          — numeric product id ("443107430")
 *   .name                 — title ("Women Floral Print A-Line Dress")
 *   .brandName            — brand display name ("Fig")
 *   .brickCategory        — gender source ("Women" / "Men")
 *   .brickSubCategory     — top-level taxonomy ("Western Wear" / "Ethnic Wear")
 *   .brickName            — garment family ("Dresses" / "Tops" / "Jeans" / "Kurtas")
 *   .styleType            — narrower style hint ("A-line", optional)
 *   .variantOptions[]     — array of size variants:
 *       .scDisplaySize    — display label ("XS" .. "XXL", "28" .. "36")
 *       .stock.stockLevel — non-zero means in stock
 *   .sizeData.sizechart[0].brickBrandSizes[]   (note: sizeData lives on
 *       product.sizeData, NOT product.productDetails.sizeData — they
 *       are siblings on the product slice)
 *       — pre-parsed size chart, one entry per size:
 *           .sizeName               — matches scDisplaySize
 *           .sizeChartAttributes[]  — array of {attributeName, attributeValue}
 *               attributeName ∈ {"Bust_attribute", "Waist_attribute",
 *                                "Hips_attribute", "Length_attribute",
 *                                "Universal Size_attribute", ...}
 *               attributeValue is in INCHES as a string ("32"). Empty
 *               string ("") means dimension is not provided for this brick
 *               (e.g. dresses often omit hip; tops omit length).
 *
 * Why we prefer `sizeData.sizechart` over `fnlColorVariantData.sizeGuideDesktop`:
 *   The latter is a stringified JSON blob — same data, but requires a
 *   second JSON.parse and is more fragile when Ajio updates their
 *   serialization. `sizeData.sizechart` is already parsed into objects
 *   for us and has been stable in shape across the products inspected.
 *
 * Failure modes (matching the ExtractionResult contract):
 *   - No __PRELOADED_STATE__         → "selectors_failed", "preloaded_state_not_found"
 *   - JSON parse failed              → "selectors_failed", "preloaded_state_parse_failed"
 *   - productDetails missing         → "selectors_failed", "productDetails_missing"
 *   - Couldn't classify gender/cat   → "selectors_failed" with detail
 *   - variantOptions empty           → "no_sizes_listed"
 *   - All sizes lacked measurements  → "no_size_chart_found" (Ajio doesn't
 *                                       seem to fall back to image charts
 *                                       the way Myntra does)
 */

import type {
  Category,
  Dimension,
  ExtractionResult,
  Gender,
  ParsedProduct,
} from "../../lib/types";
import { classifyStyle } from "../../lib/style";
import { findHydrationJson } from "../utils/extractJson";
import type { SiteAdapter } from "./types";

const PDP_PATTERN = /\/p\/\d+/;
const STATE_MARKERS = [
  "window.__PRELOADED_STATE__ = ",
  "window.__PRELOADED_STATE__=",
];

function matches(url: string): boolean {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("ajio.com")) return false;
    return PDP_PATTERN.test(u.pathname);
  } catch {
    return false;
  }
}

function parse(doc: Document, url: string): ExtractionResult {
  const stateJson = findHydrationJson(doc, STATE_MARKERS);
  if (!stateJson) {
    return { ok: false, reason: "selectors_failed", detail: "preloaded_state_not_found" };
  }

  let state: any;
  try {
    state = JSON.parse(stateJson);
  } catch {
    return { ok: false, reason: "selectors_failed", detail: "preloaded_state_parse_failed" };
  }

  // The product slice has two parallel fields we need:
  //   product.productDetails  — identity, classification, variants, prices
  //   product.sizeData        — size chart (sibling, NOT nested inside
  //                              productDetails despite the documentation
  //                              implying otherwise)
  const productSlice = state?.product ?? {};
  const pdp = productSlice.productDetails;
  if (!pdp) {
    return { ok: false, reason: "selectors_failed", detail: "productDetails_missing" };
  }

  // === Identity =========================================================
  // baseProduct is the numeric stable id; the option code (with color
  // suffix) lives in `code`. We use baseProduct for our id since it's
  // shared across color variants of the same garment.
  const id: string = String(pdp.baseProduct ?? pdp.code ?? "");
  const brand: string = String(pdp.brandName ?? "Unknown");
  const title: string = String(pdp.name ?? "");

  const gender = inferGender(pdp);
  const category = inferCategory(pdp);
  if (!gender || !category) {
    return {
      ok: false,
      reason: "selectors_failed",
      detail: `could_not_classify gender=${gender} category=${category} brick=${pdp.brickName} sub=${pdp.brickSubCategory}`,
    };
  }

  // === Style classification ============================================
  // The shared classifier expects the same shape we use for Myntra:
  // articleType drives garment family, lengthAttribute disambiguates
  // short vs long for kurtas/dresses. Ajio's brickName maps cleanly to
  // articleType. There's no direct equivalent of Myntra's "Length"
  // article attribute on Ajio — `styleType` carries some signal
  // ("A-line", "Maxi", "Mini") but not on every product, so we pass
  // it as the length hint when present and fall back to title parsing
  // inside the classifier.
  const articleType = String(pdp.brickName ?? "");
  const lengthAttribute = String(pdp.styleType ?? "");
  const garmentStyle = classifyStyle({ articleType, lengthAttribute, title, category });

  // === Sizes ===========================================================
  const variantOptions: any[] = Array.isArray(pdp.variantOptions) ? pdp.variantOptions : [];
  if (variantOptions.length === 0) {
    return { ok: false, reason: "no_sizes_listed", detail: "variantOptions_empty" };
  }

  // Walk variantOptions to collect size labels. We accept any variant
  // even if stock is zero — out-of-stock sizes still inform the fit
  // verdict (the user might be deciding whether to wait for a restock).
  const sizeList: string[] = [];
  for (const v of variantOptions) {
    const label = String(v?.scDisplaySize ?? "").trim();
    if (label && !sizeList.includes(label)) sizeList.push(label);
  }
  if (sizeList.length === 0) {
    return { ok: false, reason: "no_sizes_listed", detail: "all_variants_lacked_scDisplaySize" };
  }

  // === Measurements ====================================================
  // Pull the size chart from `sizeData.sizechart[0].brickBrandSizes`.
  // Each entry has sizeName + sizeChartAttributes[]. We index by
  // sizeName so we can match against the size labels we already
  // collected. Some sizes may be missing from the chart (Ajio shows
  // them anyway — possibly extended sizes not yet measured). Those
  // get an empty measurements record and the fit-math layer will
  // gracefully degrade to "size data unclear".
  const measurements: Record<string, Partial<Record<Dimension, number>>> = {};
  for (const s of sizeList) measurements[s] = {};

  // sizeData is a sibling of productDetails on the product slice, not
  // a nested field of productDetails itself.
  const chartArray = productSlice?.sizeData?.sizechart;
  const brickBrandSizes: any[] = Array.isArray(chartArray?.[0]?.brickBrandSizes)
    ? chartArray[0].brickBrandSizes
    : [];

  for (const row of brickBrandSizes) {
    const sizeName = String(row?.sizeName ?? "").trim();
    if (!sizeName || !measurements[sizeName]) continue;
    const attrs: any[] = Array.isArray(row?.sizeChartAttributes) ? row.sizeChartAttributes : [];
    for (const a of attrs) {
      const dim = normalizeAttributeName(String(a?.attributeName ?? ""));
      if (!dim) continue;
      const inches = parseInchesValue(a?.attributeValue);
      if (inches !== null) measurements[sizeName][dim] = inches;
    }
  }

  // Did anything stick? Ajio products that ship with image-only size
  // guides (rare for branded apparel, more common for accessories /
  // fashion jewelry) will have empty brickBrandSizes. We can't help
  // those — surface as no_size_chart_found.
  const anyMeasurements = sizeList.some(
    (s) => Object.keys(measurements[s] ?? {}).length > 0,
  );
  if (!anyMeasurements) {
    return {
      ok: false,
      reason: "no_size_chart_found",
      detail: "sizes_carried_no_measurements",
    };
  }

  const product: ParsedProduct = {
    id, site: "ajio", brand, title, gender, category, garmentStyle,
    sizes: sizeList, measurements, url,
  };
  return { ok: true, product };
}

// ===== Classification helpers ===========================================

function inferGender(pdp: any): Gender | null {
  // brickCategory is the most reliable signal — it's the top-level user
  // taxonomy on Ajio ("Men" / "Women" / "Kids"). Fall back to title
  // scan only if it's missing.
  const brick = String(pdp?.brickCategory ?? "").toLowerCase();
  if (brick.includes("women") || brick.includes("girl")) return "female";
  if (brick.includes("men") || brick.includes("boy")) return "male";

  const title = String(pdp?.name ?? "").toLowerCase();
  if (title.includes("women") || title.includes("girls")) return "female";
  if (title.includes("men") || title.includes("boys")) return "male";
  return null;
}

function inferCategory(pdp: any): Category | null {
  const brickName = String(pdp?.brickName ?? "").toLowerCase();
  const sub = String(pdp?.brickSubCategory ?? "").toLowerCase();

  // Dresses first — both Western and Ethnic dresses route to "dress"
  // since they share the dress silhouette family in our asset registry.
  if (brickName.includes("dress") || brickName.includes("gown")) return "dress";

  // Bottoms — checked before tops because "shirt" appears as a substring
  // in some bottom names (e.g. "shirt-style trousers", uncommon but real).
  const BOTTOM_KEYWORDS = [
    "jeans", "jegging", "trouser", "pant", "short", "skirt",
    "legging", "chino", "jogger", "track pant",
    "salwar", "churidar", "palazzo",
  ];
  if (BOTTOM_KEYWORDS.some((k) => brickName.includes(k))) return "bottom";

  // Tops — includes ethnic kurtas/kurtis/tunics which the silhouette
  // layer further refines via classifyStyle().
  const TOP_KEYWORDS = [
    "shirt", "tshirt", "top", "tunic", "blouse",
    "kurta", "kurti",
    "sweater", "cardigan", "sweatshirt", "hoodie",
    "tee", "tank",
  ];
  if (TOP_KEYWORDS.some((k) => brickName.includes(k))) return "top";

  // Western Wear without a recognized brick is likely a top we don't
  // have an explicit keyword for. Don't guess — surface as
  // unclassifiable so we don't render a wrong silhouette.
  void sub;
  return null;
}

// ===== Measurement parsing ==============================================

/**
 * Map Ajio's attributeName strings to our internal Dimension names.
 * Ajio uses the convention "<Label>_attribute" for each measurement.
 * Examples: "Bust_attribute", "Waist_attribute", "Hips_attribute",
 * "Length_attribute". Returns null for non-measurement attributes
 * like "Universal Size_attribute" / "Brand Size_attribute".
 */
function normalizeAttributeName(raw: string): Dimension | null {
  const s = raw.toLowerCase();
  if (s.startsWith("bust")) return "bust";
  if (s.startsWith("chest")) return "chest";
  if (s.startsWith("waist")) return "waist";
  if (s.startsWith("hip")) return "hip";       // matches "Hips_attribute"
  if (s.startsWith("inseam")) return "inseam";
  if (s.startsWith("length")) return "length";
  return null;
}

/**
 * Parse Ajio's attributeValue strings to inches. Ajio stores values as
 * strings already in inches (e.g. "32" for XS bust). Empty string means
 * "not provided for this brick", which we surface as null so the dim
 * is omitted from the measurements record. We deliberately do NOT
 * fall back to convertedAttributeValue (cm) here — if the imperial
 * value is missing on Ajio's side, we'd rather show "size data unclear"
 * than potentially misinterpret a value with the wrong unit.
 */
function parseInchesValue(rawValue: unknown): number | null {
  if (rawValue == null) return null;
  const s = String(rawValue).trim();
  if (!s) return null;

  // Range parsing for completeness — we haven't seen Ajio use ranges in
  // sizeData.sizechart, but the sizeGuideDesktop string sometimes has
  // them ("32-34"). Average the bounds. If neither range nor a number
  // is present, give up.
  const rangeMatch = s.match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
  let num: number;
  if (rangeMatch) {
    num = (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
  } else {
    const numMatch = s.match(/(\d+\.?\d*)/);
    if (!numMatch) return null;
    num = parseFloat(numMatch[1]);
  }
  if (isNaN(num)) return null;
  return num;
}

export const ajioAdapter: SiteAdapter = {
  site: "ajio",
  matches,
  parse,
};

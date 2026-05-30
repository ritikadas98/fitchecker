/**
 * H&M INDIA ADAPTER — handles tops, bottoms, and dresses.
 *
 * URL pattern: hostname is www2.hm.com, path matches /<lang>/productpage.<digits>.html
 *   /en_in/productpage.1338026002.html
 *
 * Hydration data location: <script id="__NEXT_DATA__" type="application/json">{...}</script>
 *   Standard Next.js page hydration script. Pure JSON, no variable
 *   assignment wrapper, so JSON.parse on textContent works directly —
 *   no brace-counting needed unlike Myntra/Ajio.
 *
 * Within __NEXT_DATA__ the path of interest is:
 *   props.pageProps.productPageProps.aemData.productArticleDetails
 *
 * Key fields used:
 *   .articleCode (sibling on productPageProps) — active color SKU like "1338026002"
 *   .baseProductCode — "1338026_group_002" (used as the canonical product id)
 *   .productName     — "Waisted cotton shirt dress"
 *   .brand           — "H&M" (always)
 *   .presentationTypes — "Dress" / "Trousers" / "T-shirt" / "Shirt" / etc.
 *   .productCategory — "Maxi Dresses" (display label, for fallback signals)
 *   .variations[articleCode] — the active color variation:
 *     .mainCategory  — taxonomy key like "ladies_dresses_maxidresses"
 *                       prefix → gender ("ladies"=female, "men"=male)
 *                       segments → category (dresses/jeans/shirts/etc.)
 *     .sizes[]       — array of size variants:
 *       .name        — display label (e.g. "XS", "M", "3XL", or "38" for women's bottoms)
 *       .sizeCode    — internal SKU; we don't use this for fit
 *     .productAttributes.description[] — array of {title, values} attribute pairs.
 *       Look for title === "measurement" — values is an array of strings,
 *       one per size, formatted like "XXS: Width: 1.23 m, Length: 1.16 m".
 *       The "Length" portion is the garment's overall length (top of shoulder
 *       to hem) — the only per-product measurement we can extract directly
 *       from the PDP. Used as the length axis where available.
 *
 * Why we use a STATIC SIZE CHART for bust/waist/hip rather than the page:
 *   H&M India does not include the per-size body measurement chart in the
 *   page hydration. The "Size guide" modal makes a lazy fetch to api.hm.com
 *   when opened — outside our adapter's scope (adapters MUST NOT touch the
 *   network). Instead we ship H&M's published standardized size chart as
 *   static data in lib/hm-size-chart.ts, keyed by gender + category + size
 *   name. This is less fidelity-preserving than per-product charts but
 *   accurate enough since H&M's chart applies uniformly across their lines.
 *
 * Failure modes:
 *   - No __NEXT_DATA__ script tag         → "selectors_failed", "next_data_not_found"
 *   - JSON parse failed                   → "selectors_failed", "next_data_parse_failed"
 *   - productArticleDetails missing       → "selectors_failed", "productArticleDetails_missing"
 *   - mainCategory unparseable            → "selectors_failed" with detail
 *   - Active variation missing            → "selectors_failed", "active_variation_missing"
 *   - sizes[] empty                       → "no_sizes_listed"
 *   - No size in chart matched any variant → "no_size_chart_found"
 */

import type {
  Category,
  Dimension,
  ExtractionResult,
  Gender,
  ParsedProduct,
} from "../../lib/types";
import { classifyStyle } from "../../lib/style";
import { lookupHmMeasurements, hasChartFor } from "../../lib/hm-size-chart";
import type { SiteAdapter } from "./types";

// Match the productpage.<digits>.html convention anywhere in the path,
// regardless of locale prefix (some H&M India URLs strip /en_in/, some
// retain it; both are valid PDPs). Query strings and fragments are
// ignored by URL.pathname so they need no special handling.
const PDP_PATTERN = /\/productpage\.\d+\.html\b/i;

function matches(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname !== "www2.hm.com") return false;
    return PDP_PATTERN.test(u.pathname);
  } catch {
    return false;
  }
}

/**
 * Extract __NEXT_DATA__ from the rendered DOM. Unlike Myntra/Ajio (which
 * use `window.__VAR = {...}` assignments needing a brace-counting parser),
 * Next.js writes hydration as a pure JSON script tag.
 */
function extractNextData(doc: Document): unknown | null {
  const el = doc.querySelector('script#__NEXT_DATA__[type="application/json"]');
  if (!el || !el.textContent) return null;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

/**
 * Parse mainCategory like "ladies_dresses_maxidresses" or "men_jeans_slim".
 *   prefix:  ladies → female, men → male, (kids → unsupported)
 *   middle:  dresses → dress, jeans/trousers/shorts/skirts → bottom, others → top
 */
function classifyMainCategory(
  mainCategory: string
): { gender: Gender; category: Category } | null {
  const lower = mainCategory.toLowerCase();
  let gender: Gender;
  if (lower.startsWith("ladies_") || lower === "ladies") gender = "female";
  else if (lower.startsWith("men_") || lower === "men") gender = "male";
  else return null; // kids, unisex, divided, etc. — not supported

  // Strip the gender prefix to get the family.
  const tail = lower.replace(/^(ladies|men)_?/, "");

  // Category lookup. Order matters — "dresses" has to come before
  // anything that might also contain a substring match.
  if (tail.includes("dress") || tail.includes("jumpsuit") || tail.includes("playsuit"))
    return { gender, category: "dress" };

  const bottomKeywords = [
    "jean",
    "trouser",
    "short",
    "skirt",
    "legging",
    "jogger",
    "chino",
    "pant",
    "salwar",
    "palazzo",
  ];
  if (bottomKeywords.some((k) => tail.includes(k)))
    return { gender, category: "bottom" };

  // Default to top — covers shirts, blouses, tshirts, sweaters, hoodies,
  // cardigans, kurtas, blazers, jackets, coats, etc.
  return { gender, category: "top" };
}

/**
 * Parse the productAttributes.measurement strings to extract per-size
 * garment length. Each string looks like:
 *   "XXS: Width: 1.23 m, Length: 1.16 m"
 *   "M: Width: 1.50 m, Length: 1.22 m"
 *
 * We pull out the size key and the Length value (in meters), convert to
 * inches, and return a Map. Width is intentionally ignored — it's flat
 * fabric width, not body chest, and the relationship between the two
 * varies per garment cut (loose vs fitted). The static chart's bust value
 * is more reliable.
 *
 * Lines that don't fit the expected pattern (e.g. "Back: Length: 109 cm")
 * are skipped silently rather than failing the whole extraction.
 */
function parseGarmentLengths(measurementStrs: unknown): Map<string, number> {
  const result = new Map<string, number>();
  if (!Array.isArray(measurementStrs)) return result;

  for (const raw of measurementStrs) {
    if (typeof raw !== "string") continue;
    // Match "<SIZE>: ... Length: <num> m"
    const m = raw.match(/^([A-Z0-9]+):\s.*Length:\s*([\d.]+)\s*m\b/i);
    if (!m) continue;
    const sizeKey = m[1].toUpperCase();
    const meters = parseFloat(m[2]);
    if (isNaN(meters) || meters <= 0) continue;
    const inches = meters * 39.3701;
    result.set(sizeKey, Math.round(inches * 4) / 4); // round to 0.25 inch
  }
  return result;
}

/** Best-effort access into nested objects. Returns undefined if any step fails. */
function getPath(root: unknown, path: string[]): unknown {
  let cur: unknown = root;
  for (const seg of path) {
    if (cur && typeof cur === "object" && seg in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cur;
}

function parse(doc: Document, url: string): ExtractionResult {
  const nd = extractNextData(doc);
  if (!nd) {
    return {
      ok: false,
      reason: "selectors_failed",
      detail: "next_data_not_found",
    };
  }

  const ppp = getPath(nd, ["props", "pageProps", "productPageProps"]);
  const articleCode = getPath(ppp, ["articleCode"]);
  const pad = getPath(ppp, ["aemData", "productArticleDetails"]);

  if (!pad || typeof articleCode !== "string") {
    return {
      ok: false,
      reason: "selectors_failed",
      detail: "productArticleDetails_missing",
    };
  }

  const variations = getPath(pad, ["variations"]);
  const activeVariation = getPath(variations, [articleCode]);
  if (!activeVariation || typeof activeVariation !== "object") {
    return {
      ok: false,
      reason: "selectors_failed",
      detail: "active_variation_missing",
    };
  }

  const mainCategory = getPath(activeVariation, ["mainCategory"]);
  if (typeof mainCategory !== "string") {
    return {
      ok: false,
      reason: "selectors_failed",
      detail: "mainCategory_missing",
    };
  }

  const cls = classifyMainCategory(mainCategory);
  if (!cls) {
    return {
      ok: false,
      reason: "selectors_failed",
      detail: `unsupported_mainCategory:${mainCategory}`,
    };
  }
  const { gender, category } = cls;

  if (!hasChartFor(gender, category)) {
    return {
      ok: false,
      reason: "selectors_failed",
      detail: `no_chart_for:${gender}_${category}`,
    };
  }

  // Sizes
  const sizesRaw = getPath(activeVariation, ["sizes"]);
  if (!Array.isArray(sizesRaw) || sizesRaw.length === 0) {
    return {
      ok: false,
      reason: "no_sizes_listed",
      detail: "variation_sizes_empty",
    };
  }

  const sizeNames: string[] = [];
  for (const s of sizesRaw) {
    const name = getPath(s, ["name"]);
    if (typeof name === "string" && name.trim().length > 0) {
      sizeNames.push(name.trim());
    }
  }
  if (sizeNames.length === 0) {
    return {
      ok: false,
      reason: "no_sizes_listed",
      detail: "all_sizes_lacked_name",
    };
  }

  // Per-size garment length from productAttributes.measurement.
  // Format: array of strings like "XS: Width: 1.34 m, Length: 1.19 m".
  // Optional — not every product carries it.
  const description = getPath(activeVariation, ["productAttributes", "description"]);
  let lengthBySize = new Map<string, number>();
  if (Array.isArray(description)) {
    for (const item of description) {
      if (
        item &&
        typeof item === "object" &&
        (item as Record<string, unknown>).title === "measurement"
      ) {
        lengthBySize = parseGarmentLengths((item as Record<string, unknown>).values);
        break;
      }
    }
  }

  // Build measurements record per size.
  const measurements: Record<string, Partial<Record<Dimension, number>>> = {};
  let anyMatched = false;

  for (const sizeName of sizeNames) {
    const body = lookupHmMeasurements(gender, category, sizeName);
    const dims: Partial<Record<Dimension, number>> = {};

    if (body) {
      anyMatched = true;
      // Map BodyMeasurement → Dimension. BodyMeasurement uses "bust" as
      // the upper-body width term (chest for men is stored under bust
      // for unified handling downstream — fit-math accepts either).
      if (body.bust != null) dims.bust = body.bust;
      if (body.waist != null) dims.waist = body.waist;
      if (body.hip != null) dims.hip = body.hip;
      if (body.length != null) dims.length = body.length;
    }

    // Per-product garment length overrides chart inseam where available.
    // For dresses + tops this is the only length source we have.
    const garmentLen = lengthBySize.get(sizeName.toUpperCase());
    if (garmentLen != null) {
      dims.length = garmentLen;
    }

    measurements[sizeName] = dims;
  }

  if (!anyMatched && lengthBySize.size === 0) {
    // Neither the static chart nor productAttributes covered any of the
    // sizes — H&M shipped a label format we don't recognize at all.
    return {
      ok: false,
      reason: "no_size_chart_found",
      detail: `unmatched_size_labels:${sizeNames.slice(0, 5).join(",")}`,
    };
  }

  // Identity fields
  const baseProductCode = getPath(pad, ["baseProductCode"]);
  const productName = getPath(pad, ["productName"]);
  const brand = getPath(pad, ["brand"]);
  const presentationTypes = getPath(pad, ["presentationTypes"]);
  const productCategory = getPath(pad, ["productCategory"]);

  const id =
    typeof baseProductCode === "string" && baseProductCode.length > 0
      ? baseProductCode
      : (articleCode as string);
  const title = typeof productName === "string" ? productName : "";
  const brandStr = typeof brand === "string" ? brand : "H&M";

  // Style classifier — feed it presentationTypes (cleanest single label
  // available like "Dress", "Trousers") plus the title for fallback.
  const articleType =
    typeof presentationTypes === "string"
      ? presentationTypes
      : typeof productCategory === "string"
      ? productCategory
      : undefined;

  const garmentStyle = classifyStyle({
    articleType,
    title,
    category,
  });

  const product: ParsedProduct = {
    id,
    site: "hm",
    brand: brandStr,
    title,
    gender,
    category,
    garmentStyle,
    sizes: sizeNames,
    measurements,
    url,
  };

  return { ok: true, product };
}

export const hmAdapter: SiteAdapter = {
  site: "hm",
  matches,
  parse,
};

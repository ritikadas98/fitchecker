/**
 * MYNTRA ADAPTER — handles tops, bottoms, and dresses.
 *
 * Reads PDP data from `window.__myx.pdpData`. Same brace-counting JSON
 * extraction as before, plus:
 *   - Recognizes "Dresses" / "Maxi Dresses" articleType into category="dress"
 *   - Extracts hip column from size charts when present
 *   - Passes garmentStyle through the shared classifier
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

const PDP_PATTERN = /\/\d+\/buy\/?$/;
const MYX_MARKERS = ["window.__myx = ", "window.__myx="];

function matches(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname !== "www.myntra.com") return false;
    return PDP_PATTERN.test(u.pathname);
  } catch {
    return false;
  }
}

function parse(doc: Document, url: string): ExtractionResult {
  const fromJson = parseFromHydrationData(doc, url);
  if (fromJson.ok) return fromJson;
  return parseFromDOM(doc, url, fromJson.detail);
}

function parseFromHydrationData(doc: Document, url: string): ExtractionResult {
  const myxJson = findHydrationJson(doc, MYX_MARKERS);

  if (!myxJson) {
    return { ok: false, reason: "selectors_failed", detail: "myx_assignment_not_found" };
  }

  let myx: any;
  try {
    myx = JSON.parse(myxJson);
  } catch {
    return { ok: false, reason: "selectors_failed", detail: "myx_json_parse_failed" };
  }

  const pdp = myx?.pdpData;
  if (!pdp) {
    return { ok: false, reason: "selectors_failed", detail: "pdpData_missing" };
  }

  const id: string = String(pdp.id ?? pdp.styleId ?? "");
  const brand: string = String(pdp.brand?.name ?? "Unknown");
  const title: string = String(pdp.name ?? "");

  const gender = inferGender(pdp);
  const category = inferCategory(pdp);
  if (!gender || !category) {
    return {
      ok: false, reason: "selectors_failed",
      detail: `could_not_classify gender=${gender} category=${category} articleType=${pdp.analytics?.articleType}`,
    };
  }

  const articleType = String(pdp.analytics?.articleType ?? "");
  const lengthAttribute = String(pdp.articleAttributes?.Length ?? "");
  const garmentStyle = classifyStyle({ articleType, lengthAttribute, title, category });

  // === Sizes & measurements ==============================================
  const rawSizes: any[] = Array.isArray(pdp.sizes) ? pdp.sizes : [];
  if (rawSizes.length === 0) {
    return { ok: false, reason: "no_sizes_listed", detail: "sizes_array_missing_or_empty" };
  }

  const measurements: Record<string, Partial<Record<Dimension, number>>> = {};
  const garmentMeasurements: Record<string, Partial<Record<Dimension, number>>> = {};
  const sizeList: string[] = [];

  for (const row of rawSizes) {
    const sizeLabel = String(row.label ?? row.size ?? "").trim();
    if (!sizeLabel) continue;
    sizeList.push(sizeLabel);

    // Myntra exposes BOTH "Bust" (garment flat) AND "To Fit Bust" (body
    // chart) as separate rows in row.measurements. Same for waist, hip.
    // We split them: "To Fit X" → measurements (body chart),
    // bare "X" → garmentMeasurements (garment flat).
    const bodyDims: Partial<Record<Dimension, number>> = {};
    const garmentDims: Partial<Record<Dimension, number>> = {};
    const rawMeasurements: any[] = Array.isArray(row.measurements) ? row.measurements : [];
    for (const m of rawMeasurements) {
      const rawName = String(m?.name ?? "");
      const dim = normalizeDimensionName(rawName);
      if (!dim) continue;
      const inches = parseMeasurementToInches(m?.value, m?.unit);
      if (inches === null) continue;
      const isToFit = /to\s*fit/i.test(rawName);
      if (isToFit) {
        bodyDims[dim] = inches;
      } else {
        // Bare "Bust", "Waist", etc. — these are GARMENT FLAT measurements
        // on Myntra (the actual physical garment dimensions). Length is an
        // exception — "Front Length" is garment length, which we want as
        // the length axis for the body-chart record (we don't have a
        // separate "to fit" length on Myntra).
        if (dim === "length" || dim === "inseam") {
          bodyDims[dim] = inches;
        } else {
          garmentDims[dim] = inches;
        }
      }
    }

    // Fallback: if Myntra only ships ONE column (older products, simpler
    // schemas), put whatever we got into the body chart so existing math
    // keeps working. Critically, we do NOT also write garmentMeasurements
    // in that case — duplicating the same numbers into both records makes
    // designedEase compute to 0 downstream, mis-flagging every garment as
    // "slim-fit" in the ease-aware path.
    const onlyGarmentColumn =
      Object.keys(bodyDims).length === 0 && Object.keys(garmentDims).length > 0;
    if (onlyGarmentColumn) {
      Object.assign(bodyDims, garmentDims);
    }

    measurements[sizeLabel] = bodyDims;
    if (!onlyGarmentColumn && Object.keys(garmentDims).length > 0) {
      garmentMeasurements[sizeLabel] = garmentDims;
    }
  }

  if (sizeList.length === 0) {
    return { ok: false, reason: "no_sizes_listed", detail: "all_sizes_lacked_label" };
  }

  const anyMeasurements = sizeList.some(
    (s) => Object.keys(measurements[s] ?? {}).length > 0,
  );
  if (!anyMeasurements) {
    const hasImageChart = Boolean(pdp.sizechart?.sizeRepresentationUrl);
    return {
      ok: false,
      reason: hasImageChart ? "chart_was_image" : "no_size_chart_found",
      detail: "sizes_carried_no_measurements",
    };
  }

  const hasGarmentData = Object.keys(garmentMeasurements).length > 0;
  const product: ParsedProduct = {
    id, site: "myntra", brand, title, gender, category, garmentStyle,
    sizes: sizeList, measurements, url,
    ...(hasGarmentData ? { garmentMeasurements } : {}),
  };
  return { ok: true, product };
}

function parseFromDOM(doc: Document, _url: string, hydrationDetail?: string): ExtractionResult {
  const titleEl = doc.querySelector(".pdp-title, .pdp-name, h1.pdp-name, h1.pdp-product-name");
  if (!titleEl) {
    return { ok: false, reason: "selectors_failed", detail: hydrationDetail ?? "no_title_element" };
  }
  return { ok: false, reason: "no_size_chart_found", detail: "dom_fallback_no_measurements" };
}

function normalizeDimensionName(raw: string): Dimension | null {
  const s = raw.toLowerCase();
  if (s.includes("bust")) return "bust";
  if (s.includes("chest")) return "chest";
  if (s.includes("waist")) return "waist";
  if (s.includes("hip")) return "hip";
  if (s.includes("inseam")) return "inseam";
  if (s.includes("length")) return "length";
  return null;
}

function parseMeasurementToInches(rawValue: unknown, rawUnit: unknown): number | null {
  if (rawValue == null) return null;
  const s = String(rawValue).trim();
  if (!s) return null;

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

  const unit = String(rawUnit ?? "").toLowerCase();
  if (unit.startsWith("cm") || s.toLowerCase().includes("cm")) return num / 2.54;
  return num;
}

function inferGender(pdp: any): Gender | null {
  const analyticsGender = String(pdp?.analytics?.gender ?? "").toLowerCase();
  if (analyticsGender.includes("women") || analyticsGender.includes("girl")) return "female";
  if (analyticsGender.includes("men") || analyticsGender.includes("boy")) return "male";

  const raw = String(pdp?.gender ?? pdp?.targetGender ?? "").toLowerCase();
  if (raw.includes("women") || raw.includes("female")) return "female";
  if (raw.includes("men") || raw.includes("male")) return "male";
  return null;
}

function inferCategory(pdp: any): Category | null {
  const sub = String(pdp?.analytics?.subCategory ?? "").toLowerCase();
  const article = String(pdp?.analytics?.articleType ?? "").toLowerCase();

  // Dresses are recognized first since "Dresses" subCategory should win
  // even if an article type heuristic might match "top".
  if (sub.includes("dress") || article.includes("dress") || article.includes("gown")) {
    return "dress";
  }

  if (sub.includes("topwear")) return "top";
  if (sub.includes("bottomwear")) return "bottom";

  const TOP_KEYWORDS = ["shirt", "top", "tshirt", "kurta", "kurti", "tunic", "blouse", "sweater", "hoodie"];
  const BOTTOM_KEYWORDS = ["jeans", "trouser", "pant", "short", "skirt", "leggings", "chinos", "jogger"];
  if (TOP_KEYWORDS.some((k) => article.includes(k))) return "top";
  if (BOTTOM_KEYWORDS.some((k) => article.includes(k))) return "bottom";

  return null;
}

export const myntraAdapter: SiteAdapter = {
  site: "myntra",
  matches,
  parse,
};

/**
 * Garment style classifier.
 *
 * Each retailer ships different signals about garment style. This module
 * normalizes them into our `GarmentStyle` union.
 *
 * Signals used, in priority order:
 *   1. articleType (e.g. "Kurtas", "Tshirts", "Crop Tops", "Dresses")
 *   2. attribute fields like "Length" ("Calf Length", "Maxi", "Mini")
 *   3. title keywords ("crop", "tunic", "anarkali", "maxi", "midi")
 */

import type { Category, GarmentStyle } from "./types";

export interface StyleSignals {
  articleType?: string;
  lengthAttribute?: string;
  title?: string;
  category: Category;
}

/** articleType keyword → base style. Most specific keywords first. */
const ARTICLE_TYPE_MAP: Array<{ keywords: string[]; style: GarmentStyle }> = [
  // Anarkalis explicitly
  { keywords: ["anarkali"], style: "anarkali" },
  // Dresses come before tops (a "shirt dress" is still a dress)
  { keywords: ["maxi dress", "maxi"], style: "dress_long" },
  { keywords: ["dress", "gown"], style: "dress_short" },  // refined later
  // Kurtas
  { keywords: ["kurta", "kurti"], style: "kurta_short" }, // refined later
  // Tops
  { keywords: ["crop"], style: "crop_top" },
  { keywords: ["tunic"], style: "tunic" },
  { keywords: ["tshirt", "t-shirt", "shirt", "top", "blouse", "sweater", "hoodie", "sweatshirt"], style: "top_regular" },
  // Bottoms
  { keywords: ["jeans"], style: "jeans" },
  { keywords: ["short"], style: "shorts" },
  { keywords: ["skirt"], style: "skirt" },
  { keywords: ["trouser", "pant", "chinos", "jogger", "leggings", "palazzo"], style: "trousers" },
];

/** Refine kurta length from Myntra's "Length" attribute or title cues. */
function refineKurtaLength(lengthAttr: string | undefined, title: string | undefined): GarmentStyle {
  const len = (lengthAttr ?? "").toLowerCase();
  const ttl = (title ?? "").toLowerCase();

  if (ttl.includes("anarkali") || len.includes("anarkali")) return "anarkali";
  if (len.includes("calf") || len.includes("ankle") || len.includes("floor")) return "kurta_long";
  if (len.includes("knee") && !len.includes("above")) return "kurta_long";
  return "kurta_short";
}

/** Refine top to crop/tunic if signals say so. */
function refineTopLength(
  base: GarmentStyle,
  lengthAttr: string | undefined,
  title: string | undefined,
): GarmentStyle {
  const len = (lengthAttr ?? "").toLowerCase();
  const ttl = (title ?? "").toLowerCase();
  if (ttl.includes("crop") || len.includes("crop")) return "crop_top";
  if (ttl.includes("tunic") || len.includes("tunic") || len.includes("longline") || len.includes("long line")) return "tunic";
  return base;
}

/** Refine bottoms by title — distinguishes shorts from full-length pants. */
function refineBottomLength(base: GarmentStyle, title: string | undefined): GarmentStyle {
  const ttl = (title ?? "").toLowerCase();
  if (base === "trousers" && (ttl.includes("short") || ttl.includes("bermuda"))) return "shorts";
  return base;
}

/** Refine dress length based on the Length attribute and title. */
function refineDressLength(lengthAttr: string | undefined, title: string | undefined): GarmentStyle {
  const len = (lengthAttr ?? "").toLowerCase();
  const ttl = (title ?? "").toLowerCase();
  // Maxi / floor / ankle = long
  if (len.includes("maxi") || len.includes("floor") || len.includes("ankle") || ttl.includes("maxi") || ttl.includes("ankle")) {
    return "dress_long";
  }
  // Calf-length is long for our purposes
  if (len.includes("calf")) return "dress_long";
  // Mini / above-knee / knee = short
  return "dress_short";
}

export function classifyStyle(signals: StyleSignals): GarmentStyle {
  const articleType = (signals.articleType ?? "").toLowerCase();
  const title = signals.title;
  const lengthAttr = signals.lengthAttribute;

  for (const { keywords, style } of ARTICLE_TYPE_MAP) {
    if (keywords.some((k) => articleType.includes(k))) {
      if (style === "kurta_short") return refineKurtaLength(lengthAttr, title);
      if (style === "top_regular") return refineTopLength(style, lengthAttr, title);
      if (style === "trousers" || style === "jeans") return refineBottomLength(style, title);
      if (style === "dress_short" || style === "dress_long") return refineDressLength(lengthAttr, title);
      return style;
    }
  }

  // Title-based fallback
  const ttl = (title ?? "").toLowerCase();
  if (ttl.includes("anarkali")) return "anarkali";
  if (ttl.includes("kurta") || ttl.includes("kurti")) return refineKurtaLength(lengthAttr, title);
  if (ttl.includes("maxi dress") || ttl.includes("maxi")) return "dress_long";
  if (ttl.includes("dress") || ttl.includes("gown")) return refineDressLength(lengthAttr, title);
  if (ttl.includes("crop")) return "crop_top";
  if (ttl.includes("tunic")) return "tunic";

  // Last resort by category
  if (signals.category === "dress") return "unknown_dress";
  return signals.category === "top" ? "unknown_top" : "unknown_bottom";
}

import type { ParsedProduct } from "../../../src/lib/types";
import type { Fixture } from "./index";

/**
 * H&M Straight High Jeans (women's). Real H&M behavior: hip + waist come
 * from the static published chart (lib/hm-size-chart.ts WOMEN_BOTTOMS_UK),
 * length comes from this product's perSizeLengths (all sizes ship 75 cm =
 * 29.5"). Demonstrates UK numeric labels (4, 6, 8, 10, 12, 14, 16, 18)
 * which the real adapter routes through the same chart lookup.
 */
const product: ParsedProduct = {
  id: "1209534_group_017",
  site: "hm",
  brand: "H&M",
  title: "Straight High Jeans",
  gender: "female",
  category: "bottom",
  garmentStyle: "jeans",
  sizes: ["4", "6", "8", "10", "12", "14", "16", "18"],
  measurements: {
    "4": { waist: 24.75, hip: 31.75, length: 29.5 },
    "6": { waist: 25.5, hip: 33.5, length: 29.5 },
    "8": { waist: 26.75, hip: 35.0, length: 29.5 },
    "10": { waist: 28.25, hip: 36.5, length: 29.5 },
    "12": { waist: 29.75, hip: 37.75, length: 29.5 },
    "14": { waist: 31.5, hip: 39.0, length: 29.5 },
    "16": { waist: 33.5, hip: 40.0, length: 29.5 },
    "18": { waist: 35.5, hip: 41.5, length: 29.5 },
  },
  url: "https://www2.hm.com/en_in/productpage.1209534017.html",
};

export const hmJeans: Fixture = {
  key: "hm-jeans",
  tabLabel: "H&M Straight Jeans",
  retailerName: "H&M",
  retailerAccent: "#e50010",
  pdpUrl: product.url,
  product,
  pdpImageGradient: ["#1e293b", "#475569"],
  price: "₹1,999",
  productImageLabel: "Straight High Jeans",
  imageUrls: [
    "https://image.hm.com/assets/hm/aa/75/aa757c2004789a3160ed47b7b8767a0350334d9d.jpg?imwidth=720",
    "https://image.hm.com/assets/hm/b4/87/b487b2670015dd11ebe6d09ae63d27d2bf887516.jpg?imwidth=720",
  ],
};

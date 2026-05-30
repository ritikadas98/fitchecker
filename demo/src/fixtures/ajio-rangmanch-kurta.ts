import type { ParsedProduct } from "../../../src/lib/types";
import type { Fixture } from "./index";

/**
 * AJIO ships only body-chart measurements. This kurta has bust + waist only
 * (no length column), so length verdict comes back "unknown" — visible
 * coverage limitation. Real AJIO behavior, not a fixture omission.
 */
const product: ParsedProduct = {
  id: "702325418",
  site: "ajio",
  brand: "RANGMANCH BY PANTALOONS",
  title: "Women Floral Print A-Line Kurta",
  gender: "female",
  category: "top",
  garmentStyle: "kurta_short",
  sizes: ["S", "M", "L", "XL", "XXL"],
  measurements: {
    S: { bust: 34, waist: 27 },
    M: { bust: 36, waist: 29 },
    L: { bust: 38, waist: 31 },
    XL: { bust: 40, waist: 33 },
    XXL: { bust: 42, waist: 35 },
  },
  url: "https://www.ajio.com/avaasa-mix-n-match-women-floral-print-a-line-kurta/p/443110657_offwhite",
};

export const ajioRangmanchKurta: Fixture = {
  key: "ajio-rangmanch-kurta",
  tabLabel: "Rangmanch Kurta",
  retailerName: "AJIO",
  retailerAccent: "#000000",
  pdpUrl: product.url,
  product,
  pdpImageGradient: ["#fef3c7", "#facc15"],
  price: "₹1,899",
  productImageLabel: "A-Line Kurta",
  imageUrls: [
    "https://assets.ajio.com/medias/sys_master/root1/20250930/zxrw/68db45e13d468c61ab3b6740/-473Wx593H-702325418-offwhite-MODEL.jpg",
    "https://assets.ajio.com/medias/sys_master/root1/20250930/i8XF/68db45e13d468c61ab3b66cb/-473Wx593H-702325418-offwhite-MODEL2.jpg",
    "https://assets.ajio.com/medias/sys_master/root1/20250930/COPy/68db45e13d468c61ab3b66bb/-473Wx593H-702325418-offwhite-MODEL3.jpg",
    "https://assets.ajio.com/medias/sys_master/root1/20250930/dGpN/68db45e13d468c61ab3b66c2/-473Wx593H-702325418-offwhite-MODEL4.jpg",
  ],
};

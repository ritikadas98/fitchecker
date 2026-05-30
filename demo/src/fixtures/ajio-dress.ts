import type { ParsedProduct } from "../../../src/lib/types";
import type { Fixture } from "./index";

const product: ParsedProduct = {
  id: "443107430",
  site: "ajio",
  brand: "FIG",
  title: "FIG Women Floral Print A-Line Dress",
  gender: "female",
  category: "dress",
  garmentStyle: "dress_short",
  sizes: ["XS", "S", "M", "L", "XL"],
  measurements: {
    XS: { bust: 32, waist: 26, hip: 34, length: 36 },
    S: { bust: 34, waist: 28, hip: 36, length: 36.5 },
    M: { bust: 36, waist: 30, hip: 38, length: 37 },
    L: { bust: 38, waist: 32, hip: 40, length: 37.5 },
    XL: { bust: 40, waist: 34, hip: 42, length: 38 },
  },
  url: "https://www.ajio.com/fig-women-floral-print-a-line-dress/p/443107430_offwhite",
};

export const ajioDress: Fixture = {
  key: "ajio-dress",
  tabLabel: "FIG Floral Dress · AJIO",
  retailerName: "AJIO",
  retailerAccent: "#000000",
  pdpUrl: product.url,
  product,
  pdpImageGradient: ["#fef3c7", "#fbcfe8"],
  price: "₹2,299",
  productImageLabel: "Floral A-Line Dress",
};

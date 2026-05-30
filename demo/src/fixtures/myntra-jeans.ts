import type { ParsedProduct } from "../../../src/lib/types";
import type { Fixture } from "./index";

const product: ParsedProduct = {
  id: "12345678",
  site: "myntra",
  brand: "KASHIANXSTYLE",
  title: "KASHIANXSTYLE Women Relaxed Fit High-Rise Jeans",
  gender: "female",
  category: "bottom",
  garmentStyle: "jeans",
  sizes: ["26", "28", "30", "32", "34"],
  measurements: {
    "26": { waist: 26, hip: 35, length: 27.5 },
    "28": { waist: 28, hip: 37, length: 28 },
    "30": { waist: 30, hip: 39, length: 28.5 },
    "32": { waist: 32, hip: 41, length: 29 },
    "34": { waist: 34, hip: 43, length: 29.5 },
  },
  url: "https://www.myntra.com/jeans/kashianxstyle/kashianxstyle-women-relaxed-fit-high-rise-jeans/12345678/buy",
};

export const myntraJeans: Fixture = {
  key: "myntra-jeans",
  tabLabel: "KASHIANXSTYLE Jeans · Myntra",
  retailerName: "Myntra",
  retailerAccent: "#ff3e6c",
  pdpUrl: product.url,
  product,
  pdpImageGradient: ["#1f2937", "#4b5563"],
  price: "₹1,499",
  productImageLabel: "Relaxed Fit Jeans",
};

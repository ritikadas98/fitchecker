import type { ParsedProduct } from "../../../src/lib/types";
import type { Fixture } from "./index";

const product: ParsedProduct = {
  id: "469800792",
  site: "ajio",
  brand: "LEVI'S",
  title: "Men Lightly Washed 513 Straight Jeans",
  gender: "male",
  category: "bottom",
  garmentStyle: "jeans",
  // Size 42 is in variantOptions on the real PDP but absent from the chart,
  // so the real adapter would emit no measurements for it. Drop it here so
  // the verdict list stays clean.
  sizes: ["28", "30", "32", "34", "36", "38", "40"],
  measurements: {
    "28": { waist: 30, inseam: 32 },
    "30": { waist: 32, inseam: 32 },
    "32": { waist: 34, inseam: 32 },
    "34": { waist: 36, inseam: 32 },
    "36": { waist: 38, inseam: 32 },
    "38": { waist: 40, inseam: 32 },
    "40": { waist: 42, inseam: 32 },
  },
  url: "https://www.ajio.com/levi-s-men-lightly-washed-513-straight-jeans/p/469800792_darkindigo",
};

export const ajioLevisJeans: Fixture = {
  key: "ajio-levis-jeans",
  tabLabel: "Levi's 513 Jeans",
  retailerName: "AJIO",
  retailerAccent: "#000000",
  pdpUrl: product.url,
  product,
  pdpImageGradient: ["#1e3a8a", "#1e40af"],
  price: "₹3,299",
  productImageLabel: "513 Straight Jeans",
  imageUrls: [
    "https://assets.ajio.com/medias/sys_master/root1/20260206/ZY6o/6985c182cbfa0d5608c764c4/-473Wx593H-469800792-darkindigo-MODEL.jpg",
    "https://assets.ajio.com/medias/sys_master/root1/20260206/nefL/6985b6fdcbfa0d5608c7533f/-473Wx593H-469800792-darkindigo-MODEL2.jpg",
    "https://assets.ajio.com/medias/sys_master/root1/20260206/KD8p/6985bf257ef0c7385cbbe12d/-473Wx593H-469800792-darkindigo-MODEL3.jpg",
    "https://assets.ajio.com/medias/sys_master/root1/20260206/XsFB/6985ba84cbfa0d5608c75951/-473Wx593H-469800792-darkindigo-MODEL4.jpg",
  ],
};

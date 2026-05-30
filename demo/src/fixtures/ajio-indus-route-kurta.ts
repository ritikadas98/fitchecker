import type { ParsedProduct } from "../../../src/lib/types";
import type { Fixture } from "./index";

const product: ParsedProduct = {
  id: "701909995",
  site: "ajio",
  brand: "Indus Route by Pantaloons",
  title: "Men Ikat Print Regular Fit Kurta",
  gender: "male",
  category: "top",
  garmentStyle: "kurta_short",
  sizes: ["S", "M", "L", "XL", "XXL"],
  measurements: {
    S: { chest: 38, waist: 30.5, length: 29.5 },
    M: { chest: 40, waist: 32.5, length: 30 },
    L: { chest: 42, waist: 34.5, length: 30.5 },
    XL: { chest: 44, waist: 36.5, length: 31 },
    XXL: { chest: 46, waist: 38.5, length: 31.5 },
  },
  url: "https://www.ajio.com/indus-route-by-pantaloons-men-ikat-print-regular-fit-kurta/p/701909995_green",
};

export const ajioIndusRouteKurta: Fixture = {
  key: "ajio-indus-route-kurta",
  tabLabel: "Indus Route Kurta",
  retailerName: "AJIO",
  retailerAccent: "#000000",
  pdpUrl: product.url,
  product,
  pdpImageGradient: ["#065f46", "#10b981"],
  price: "₹1,799",
  productImageLabel: "Ikat Print Kurta",
  imageUrls: [
    "https://assets.ajio.com/medias/sys_master/root1/20250818/v8aQ/68a2dbf48bfb9009ac862f67/-473Wx593H-701909995-green-MODEL.jpg",
    "https://assets.ajio.com/medias/sys_master/root1/20250818/r55x/68a2dbf48bfb9009ac862f1c/-473Wx593H-701909995-green-MODEL2.jpg",
    "https://assets.ajio.com/medias/sys_master/root1/20250818/qAoL/68a2dbf48bfb9009ac862f18/-473Wx593H-701909995-green-MODEL3.jpg",
    "https://assets.ajio.com/medias/sys_master/root1/20250818/jdXu/68a2dbf48bfb9009ac862f12/-473Wx593H-701909995-green-MODEL4.jpg",
  ],
};

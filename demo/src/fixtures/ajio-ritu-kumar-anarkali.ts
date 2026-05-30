import type { ParsedProduct } from "../../../src/lib/types";
import type { Fixture } from "./index";

/**
 * Ritu Kumar anarkali kurta suit set. Note category="top" rather than
 * "dress" — mirrors AJIO's own classification (brickName "Kurta Suit
 * Sets" maps to top in the real adapter). styleType="Anarkali" routes
 * the garmentStyle classifier to "anarkali", which uses a 50" length
 * baseline and a 2-pin silhouette (bust + length). The 48" length here
 * comes in ~2" below baseline — well within the top-category length
 * tolerance, so length verdict reads "Good length" on an average
 * 5'4" body.
 */
const product: ParsedProduct = {
  id: "410332969",
  site: "ajio",
  brand: "RITU KUMAR",
  title: "Relaxed Fit Printed Crepe Anarkali Kurta with Leggings & Dupatta",
  gender: "female",
  category: "top",
  garmentStyle: "anarkali",
  sizes: ["S", "M", "L", "XL"],
  measurements: {
    S: { bust: 34, waist: 28, hip: 37, length: 48 },
    M: { bust: 36, waist: 30, hip: 39, length: 48 },
    L: { bust: 38, waist: 32, hip: 41, length: 48 },
    XL: { bust: 40, waist: 34, hip: 43, length: 48 },
  },
  url: "https://www.ajio.com/ritu-kumar-relaxed-fit-printed-crepe-anarkali-kurta-with-leggings--dupatta/p/410332969_pink",
};

export const ajioRituKumarAnarkali: Fixture = {
  key: "ajio-ritu-kumar-anarkali",
  tabLabel: "Ritu Kumar Anarkali",
  retailerName: "AJIO",
  retailerAccent: "#000000",
  pdpUrl: product.url,
  product,
  pdpImageGradient: ["#fce7f3", "#f9a8d4"],
  price: "₹4,499",
  productImageLabel: "Anarkali Suit Set",
  imageUrls: [
    "https://assets.ajio.com/medias/sys_master/root/20230829/1cPW/64ee0873ddf779151987b48e/-473Wx593H-410332969-pink-MODEL.jpg",
    "https://assets.ajio.com/medias/sys_master/root/20230829/cJIm/64ee1f64afa4cf41f595f5e7/-473Wx593H-410332969-pink-MODEL2.jpg",
    "https://assets.ajio.com/medias/sys_master/root/20230829/vbWu/64ee12d6ddf779151987effe/-473Wx593H-410332969-pink-MODEL3.jpg",
    "https://assets.ajio.com/medias/sys_master/root/20230829/iroI/64ee0a62ddf779151987be23/-473Wx593H-410332969-pink-MODEL4.jpg",
  ],
};

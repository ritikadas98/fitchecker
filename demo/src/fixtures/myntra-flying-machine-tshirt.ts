import type { ParsedProduct } from "../../../src/lib/types";
import type { Fixture } from "./index";

/**
 * Flying Machine drop-shoulder tee on Myntra ships ONLY "Garment Measurement"
 * rows (Chest, Front Length, Across Shoulder) — no "To Fit Chest" body chart.
 * Mirrors the M&S dress case. The Myntra adapter routes Chest into
 * garmentMeasurements (not measurements) since there's no "To Fit" prefix;
 * length goes into measurements. analyzeWidth's ease-aware path then runs
 * from garment-flat only, inferring designed ease from style + title.
 */
const product: ParsedProduct = {
  id: "36008882",
  site: "myntra",
  brand: "Flying Machine",
  title: "Flying Machine Graphic Printed Drop-Shoulder Sleeves Pure Cotton T-shirt",
  gender: "male",
  category: "top",
  garmentStyle: "top_regular",
  sizes: ["S", "M", "L", "XL", "XXL", "3XL"],
  measurements: {
    S: { length: 26 },
    M: { length: 27 },
    L: { length: 28 },
    XL: { length: 29 },
    XXL: { length: 30 },
    "3XL": { length: 31 },
  },
  garmentMeasurements: {
    S: { chest: 39.5 },
    M: { chest: 41.5 },
    L: { chest: 45 },
    XL: { chest: 47 },
    XXL: { chest: 50.5 },
    "3XL": { chest: 51 },
  },
  url: "https://www.myntra.com/tshirts/flying+machine/flying-machine-graphic-printed-drop-shoulder-sleeves-pure-cotton-t-shirt/36008882/buy",
};

const PREFIX = "https://assets.myntassets.com/h_720,q_85,w_540/v1/assets/images/2025/AUGUST/22";

export const myntraFlyingMachineTshirt: Fixture = {
  key: "myntra-flying-machine-tshirt",
  tabLabel: "Flying Machine Tee",
  retailerName: "Myntra",
  retailerAccent: "#ff3e6c",
  pdpUrl: product.url,
  product,
  pdpImageGradient: ["#1e3a8a", "#3b82f6"],
  price: "₹1,299",
  productImageLabel: "Graphic Tee",
  imageUrls: [
    `${PREFIX}/uWxF0cja_c161465622764b43aad88921c15daa8d.jpg`,
    `${PREFIX}/W6UMbwmn_8bbf686180bf4f95ab28b79869f81846.jpg`,
    `${PREFIX}/zzc46cfk_b27ac18f7f08408c8a79ee2325a60d90.jpg`,
    `${PREFIX}/V4RTxe0R_f7a9e65718bf431b924eabe99d0162b4.jpg`,
  ],
};

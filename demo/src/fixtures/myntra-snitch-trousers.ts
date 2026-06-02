import type { ParsedProduct } from "../../../src/lib/types";
import type { Fixture } from "./index";

const product: ParsedProduct = {
  id: "38305373",
  site: "myntra",
  brand: "Snitch",
  title: "Snitch Men Trousers",
  gender: "male",
  category: "bottom",
  garmentStyle: "trousers",
  sizes: ["28", "30", "32", "34", "36", "38"],
  measurements: {
    "28": { waist: 28, inseam: 29 },
    "30": { waist: 30, inseam: 29 },
    "32": { waist: 32, inseam: 29 },
    "34": { waist: 34, inseam: 29 },
    "36": { waist: 36, inseam: 29 },
    "38": { waist: 38, inseam: 29 },
  },
  url: "https://www.myntra.com/trousers/snitch/snitch-men-trousers/38305373/buy",
  // Simulated previous purchase — see myntra-inddus-maxi for details.
  purchasedSize: "32",
};

const PREFIX = "https://assets.myntassets.com/h_720,q_85,w_540/v1/assets/images/2025/NOVEMBER/28";

export const myntraSnitchTrousers: Fixture = {
  key: "myntra-snitch-trousers",
  tabLabel: "Snitch Trousers",
  retailerName: "Myntra",
  retailerAccent: "#ff3e6c",
  pdpUrl: product.url,
  product,
  pdpImageGradient: ["#3f3f46", "#71717a"],
  price: "₹1,799",
  productImageLabel: "Men's Trousers",
  imageUrls: [
    `${PREFIX}/xoVEfWYr_39644110a13d482da856cd410d1c3f99.jpg`,
    `${PREFIX}/c1apcGW5_f62c45138cea4d97a9164ed74c036594.jpg`,
    `${PREFIX}/cnk489bg_343831ee376c405db68171d305df1483.jpg`,
    `${PREFIX}/0463q87e_a8fd925367814a6a8707949f9fd854da.jpg`,
  ],
};

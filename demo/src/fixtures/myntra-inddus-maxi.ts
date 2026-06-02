import type { ParsedProduct } from "../../../src/lib/types";
import type { Fixture } from "./index";

/**
 * Inddus floral embroidered maxi ships BOTH columns on Myntra: "To Fit Bust"
 * (body chart) AND "Bust" (garment flat). The adapter routes the "To Fit"
 * rows into measurements and the bare rows into garmentMeasurements, giving
 * the fit math both halves — designed ease becomes computed rather than
 * inferred. This is the cleanest data shape Myntra ships.
 */
const product: ParsedProduct = {
  id: "33016407",
  site: "myntra",
  brand: "Inddus",
  title: "Inddus Floral Embroidered Fit & Flared Maxi Dress",
  gender: "female",
  category: "dress",
  garmentStyle: "dress_long",
  sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"],
  measurements: {
    XS: { bust: 32, waist: 28, hip: 34, length: 55 },
    S: { bust: 34, waist: 30, hip: 36, length: 55 },
    M: { bust: 36, waist: 32, hip: 38, length: 55 },
    L: { bust: 38, waist: 34, hip: 40, length: 55 },
    XL: { bust: 40, waist: 36, hip: 42, length: 55 },
    XXL: { bust: 42, waist: 38, hip: 44, length: 55 },
    "3XL": { bust: 44.5, waist: 42, hip: 50, length: 55 },
    "4XL": { bust: 46.5, waist: 44, hip: 52, length: 55 },
    "5XL": { bust: 48.5, waist: 46, hip: 54, length: 55 },
  },
  garmentMeasurements: {
    XS: { bust: 34, waist: 30, hip: 36 },
    S: { bust: 36, waist: 32, hip: 38 },
    M: { bust: 38, waist: 34, hip: 40 },
    L: { bust: 40, waist: 36, hip: 42 },
    XL: { bust: 42, waist: 38, hip: 44 },
    XXL: { bust: 44, waist: 40, hip: 46 },
    "3XL": { bust: 46.5, waist: 44, hip: 52 },
    "4XL": { bust: 48.5, waist: 46, hip: 54 },
    "5XL": { bust: 50.5, waist: 48, hip: 56 },
  },
  url: "https://www.myntra.com/ethnic-dresses/inddus/inddus-floral-embroidered-fit--flared-maxi-dress/33016407/buy",
  // Simulates a Myntra order-history URL where the user previously bought
  // size M. The side panel's purchase-callout will compare this against
  // whatever the math picks for the user's measurements: green "Matches
  // your previous order" if the math picks M, amber "Math now recommends
  // X" otherwise.
  purchasedSize: "M",
};

const PREFIX = "https://assets.myntassets.com/h_720,q_85,w_540/v1/assets/images/2025/MARCH/1";

export const myntraInddusMaxi: Fixture = {
  key: "myntra-inddus-maxi",
  tabLabel: "Inddus Maxi Dress",
  retailerName: "Myntra",
  retailerAccent: "#ff3e6c",
  pdpUrl: product.url,
  product,
  pdpImageGradient: ["#fbcfe8", "#e879f9"],
  price: "₹2,499",
  productImageLabel: "Embroidered Maxi",
  imageUrls: [
    `${PREFIX}/0vzTyhNx_f8eaee1e20cb46c3ae76fdb55cca785f.jpg`,
    `${PREFIX}/5oRNFcfH_65c29370e00043978e6d88cee20e3981.jpg`,
    `${PREFIX}/U38Jo6uW_5d346581885b450eb499e021568b247c.jpg`,
    `${PREFIX}/H1W9XbN7_b5294560885445758f2c47b266485dbb.jpg`,
  ],
};

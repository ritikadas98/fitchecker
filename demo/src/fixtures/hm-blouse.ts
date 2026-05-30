import type { ParsedProduct } from "../../../src/lib/types";
import type { Fixture } from "./index";

/**
 * H&M Flounced Tie-Front Blouse (women's). bust/waist/hip from static chart
 * WOMEN_LETTER, length from this product's perSizeLengths (46-49 cm).
 * Length of 18-19" is short relative to top_regular's 24" baseline at 5'4",
 * so the verdict will read "Slightly short" or "Runs short" depending on
 * the user's height — honest behavior given how short H&M's blouses cut.
 */
const product: ParsedProduct = {
  id: "1337823_group_003",
  site: "hm",
  brand: "H&M",
  title: "Flounced Tie-Front Blouse",
  gender: "female",
  category: "top",
  garmentStyle: "top_regular",
  sizes: ["XXS", "XS", "S", "M", "L"],
  measurements: {
    XXS: { bust: 30.0, waist: 24.75, hip: 31.75, length: 18.1 },
    XS: { bust: 31.5, waist: 25.5, hip: 33.5, length: 18.5 },
    S: { bust: 33.75, waist: 27.5, hip: 35.75, length: 18.5 },
    M: { bust: 37.0, waist: 30.75, hip: 38.5, length: 18.9 },
    L: { bust: 40.25, waist: 34.5, hip: 41.0, length: 19.3 },
  },
  url: "https://www2.hm.com/en_in/productpage.1337823003.html",
};

export const hmBlouse: Fixture = {
  key: "hm-blouse",
  tabLabel: "H&M Tie-Front Blouse",
  retailerName: "H&M",
  retailerAccent: "#e50010",
  pdpUrl: product.url,
  product,
  pdpImageGradient: ["#fef2f2", "#fecaca"],
  price: "₹1,499",
  productImageLabel: "Tie-Front Blouse",
  imageUrls: [
    "https://image.hm.com/assets/hm/0d/6f/0d6fe7c52be2ae185a01aaf3d0c6500053bd0b19.jpg?imwidth=720",
    "https://image.hm.com/assets/hm/04/9c/049ca788951f8e7588f485d7ea016f285f64796f.jpg?imwidth=720",
  ],
};

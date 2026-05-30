import type { ParsedProduct } from "../../../src/lib/types";
import type { Fixture } from "./index";

// Values match the static H&M men's tops chart in lib/hm-size-chart.ts.
const product: ParsedProduct = {
  id: "1338026_group_002",
  site: "hm",
  brand: "H&M",
  title: "Regular Fit Cotton T-shirt",
  gender: "male",
  category: "top",
  garmentStyle: "top_regular",
  sizes: ["XS", "S", "M", "L", "XL"],
  measurements: {
    XS: { bust: 32.25, waist: 27.5, length: 27.5 },
    S: { bust: 34.75, waist: 29.75, length: 28.25 },
    M: { bust: 37.75, waist: 33.0, length: 29 },
    L: { bust: 41.0, waist: 36.25, length: 29.5 },
    XL: { bust: 44.0, waist: 39.75, length: 30 },
  },
  url: "https://www2.hm.com/en_in/productpage.1338026002.html",
};

export const hmTshirt: Fixture = {
  key: "hm-tshirt",
  tabLabel: "Cotton T-shirt · H&M",
  retailerName: "H&M",
  retailerAccent: "#e50010",
  pdpUrl: product.url,
  product,
  pdpImageGradient: ["#dbeafe", "#e0e7ff"],
  price: "₹799",
  productImageLabel: "Regular Fit T-shirt",
};

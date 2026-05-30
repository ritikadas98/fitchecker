import type { ParsedProduct } from "../../../src/lib/types";
import type { Fixture } from "./index";

/**
 * H&M Relaxed Fit Sweatpants (men's). waist/hip from static chart MEN_BOTTOMS,
 * length from this product's perSizeLengths (70-74 cm = 27.6-29.1"). Sweatpants
 * run shorter than the chart's nominal 30-32" inseam for men's bottoms, so
 * the verdict will lean toward "Slightly short" — accurate.
 */
const product: ParsedProduct = {
  id: "1012056_group_002",
  site: "hm",
  brand: "H&M",
  title: "Relaxed Fit Sweatpants",
  gender: "male",
  category: "bottom",
  garmentStyle: "trousers",
  sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  measurements: {
    XS: { waist: 27.5, hip: 34.75, length: 27.6 },
    S: { waist: 30.0, hip: 37.25, length: 28.0 },
    M: { waist: 33.0, hip: 39.5, length: 28.3 },
    L: { waist: 36.25, hip: 42.0, length: 28.7 },
    XL: { waist: 39.75, hip: 44.25, length: 28.7 },
    XXL: { waist: 43.25, hip: 46.75, length: 29.1 },
  },
  url: "https://www2.hm.com/en_in/productpage.1012056002.html",
};

export const hmSweatpants: Fixture = {
  key: "hm-sweatpants",
  tabLabel: "H&M Sweatpants",
  retailerName: "H&M",
  retailerAccent: "#e50010",
  pdpUrl: product.url,
  product,
  pdpImageGradient: ["#171717", "#404040"],
  price: "₹1,299",
  productImageLabel: "Relaxed Fit Sweatpants",
  imageUrls: [
    "https://image.hm.com/assets/hm/d8/a8/d8a85a6bcbdfb16750451b8ba44b05634d4dfd6f.jpg?imwidth=720",
    "https://image.hm.com/assets/hm/36/22/36226f7c7886e20af4c1ad3df6e21bcf276e257d.jpg?imwidth=720",
    "https://image.hm.com/assets/hm/37/1c/371c281e281b1c75f3337984110479240e6c2d21.jpg?imwidth=720",
  ],
};

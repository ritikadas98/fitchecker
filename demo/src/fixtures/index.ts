import type { ParsedProduct } from "../../../src/lib/types";

import { myntraFlyingMachineTshirt } from "./myntra-flying-machine-tshirt";
import { myntraSnitchTrousers } from "./myntra-snitch-trousers";
import { myntraInddusMaxi } from "./myntra-inddus-maxi";
import { ajioRangmanchKurta } from "./ajio-rangmanch-kurta";
import { ajioIndusRouteKurta } from "./ajio-indus-route-kurta";
import { ajioLevisJeans } from "./ajio-levis-jeans";
import { hmBlouse } from "./hm-blouse";
import { hmJeans } from "./hm-jeans";
import { hmSweatpants } from "./hm-sweatpants";

export type FixtureKey =
  | "myntra-flying-machine-tshirt"
  | "myntra-snitch-trousers"
  | "myntra-inddus-maxi"
  | "ajio-rangmanch-kurta"
  | "ajio-indus-route-kurta"
  | "ajio-levis-jeans"
  | "hm-blouse"
  | "hm-jeans"
  | "hm-sweatpants";

export interface Fixture {
  key: FixtureKey;
  /** Text shown on the Chrome tab. */
  tabLabel: string;
  /** Retailer brand name (rendered above the product on the mock PDP). */
  retailerName: string;
  /** Retailer accent color, used on the CTA + retailer header + tab favicon. */
  retailerAccent: string;
  /** Display URL in the browser's URL bar. */
  pdpUrl: string;
  /** Real ParsedProduct, fed straight into computeFit(). */
  product: ParsedProduct;
  /** Two-stop gradient for the mock product image (fallback if imageUrls absent). */
  pdpImageGradient: [string, string];
  /** Display price (rupees, since these are Indian retailers). */
  price: string;
  /** Label printed over the gradient placeholder. */
  productImageLabel: string;
  /**
   * Product photo URLs. Renders as a 2x2 grid (Myntra desktop style) when
   * 2+ are provided, a single hero image when 1 is provided, or falls back
   * to the gradient placeholder when omitted.
   *
   * URLs may be:
   *   - hot-linked from the retailer CDN (e.g. https://assets.myntassets.com/...)
   *   - relative paths to locally bundled images (./products/<slug>-1.jpg)
   *     which Vite serves from demo/public/products/.
   */
  imageUrls?: string[];
}

export const FIXTURES: Record<FixtureKey, Fixture> = {
  "myntra-flying-machine-tshirt": myntraFlyingMachineTshirt,
  "myntra-snitch-trousers": myntraSnitchTrousers,
  "myntra-inddus-maxi": myntraInddusMaxi,
  "ajio-rangmanch-kurta": ajioRangmanchKurta,
  "ajio-indus-route-kurta": ajioIndusRouteKurta,
  "ajio-levis-jeans": ajioLevisJeans,
  "hm-blouse": hmBlouse,
  "hm-jeans": hmJeans,
  "hm-sweatpants": hmSweatpants,
};

// Tab order — grouped by retailer so the favicon colors cluster visually
// (3 pink Myntra tabs, 3 black AJIO tabs, 3 red H&M tabs). Within each
// group, ordered for category variety: top → bottom → dress where
// applicable.
export const FIXTURE_ORDER: FixtureKey[] = [
  "myntra-flying-machine-tshirt",
  "myntra-snitch-trousers",
  "myntra-inddus-maxi",
  "ajio-rangmanch-kurta",
  "ajio-indus-route-kurta",
  "ajio-levis-jeans",
  "hm-blouse",
  "hm-jeans",
  "hm-sweatpants",
];

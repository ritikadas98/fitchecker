import type { ParsedProduct } from "../../../src/lib/types";
import { myntraJeans } from "./myntra-jeans";
import { ajioDress } from "./ajio-dress";
import { hmTshirt } from "./hm-tshirt";

export type FixtureKey = "myntra-jeans" | "ajio-dress" | "hm-tshirt";

export interface Fixture {
  key: FixtureKey;
  /** Text shown on the Chrome tab. */
  tabLabel: string;
  /** Retailer brand name (rendered above the product on the mock PDP). */
  retailerName: string;
  /** Retailer accent color, used on the CTA + retailer header. */
  retailerAccent: string;
  /** Display URL in the browser's URL bar. */
  pdpUrl: string;
  /** Real ParsedProduct, fed straight into computeFit(). */
  product: ParsedProduct;
  /** Two-stop gradient for the mock product image. */
  pdpImageGradient: [string, string];
  /** Display price (rupees, since these are Indian retailers). */
  price: string;
  /** Label printed over the gradient placeholder. */
  productImageLabel: string;
}

export const FIXTURES: Record<FixtureKey, Fixture> = {
  "myntra-jeans": myntraJeans,
  "ajio-dress": ajioDress,
  "hm-tshirt": hmTshirt,
};

export const FIXTURE_ORDER: FixtureKey[] = [
  "myntra-jeans",
  "ajio-dress",
  "hm-tshirt",
];

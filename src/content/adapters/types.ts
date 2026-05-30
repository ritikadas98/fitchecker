/**
 * Every retailer adapter implements this interface. To add a new retailer,
 * write one new file in this folder and register it in ./index.ts.
 *
 * The contract is deliberately small:
 *   - matches(url): is this URL a PDP for this retailer?
 *   - parse(doc):   extract a ParsedProduct from the rendered DOM.
 *
 * Adapters MUST NOT touch the network. They read what's already on the page.
 * If the page hasn't loaded yet, the content script handles that with the
 * mutation observer — by the time `parse` is called, the DOM is settled.
 */

import type { ExtractionResult } from "../../lib/types";

export interface SiteAdapter {
  /** Lowercase site key — must match the `site` field on ParsedProduct. */
  readonly site: string;

  /** Returns true if this URL is a product detail page on the retailer's site. */
  matches(url: string): boolean;

  /** Extract product info from the rendered DOM. */
  parse(doc: Document, url: string): ExtractionResult;
}

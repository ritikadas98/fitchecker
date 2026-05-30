/**
 * Adapter registry. To add a new retailer:
 *   1. Create a new file in this folder implementing SiteAdapter.
 *   2. Import it here and add it to the array below.
 *   3. Add the host pattern to manifest.json (host_permissions and content_scripts).
 *
 * That's it. No other changes anywhere in the codebase.
 */

import type { SiteAdapter } from "./types";
import { myntraAdapter } from "./myntra";
import { ajioAdapter } from "./ajio";
import { hmAdapter } from "./hm";

export const adapters: SiteAdapter[] = [myntraAdapter, ajioAdapter, hmAdapter];

export function adapterFor(url: string): SiteAdapter | null {
  return adapters.find((a) => a.matches(url)) ?? null;
}

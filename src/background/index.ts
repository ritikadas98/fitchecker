/**
 * Background service worker.
 *
 * Responsibilities:
 *   - Open the side panel when the user clicks the toolbar icon.
 *   - Receive PDP_PARSED messages from content scripts; compute the fit
 *     verdict against the stored profile; cache it per tab.
 *   - When the side panel asks for the current verdict (REQUEST_VERDICT),
 *     respond with the cached one for the active tab.
 *   - Log every meaningful event for the analytics ring buffer.
 */

import { computeFit } from "../lib/fit-math";
import { onMessage } from "../lib/messages";
import { record } from "../lib/analytics";
import { getProfile } from "../lib/storage";
import type { ExtractionResult, FitVerdict, ParsedProduct } from "../lib/types";

// Per-tab cache: tabId -> { product, verdict, failure }
type TabState = {
  product?: ParsedProduct;
  verdict: FitVerdict | null;
  failure?: ExtractionResult;
};
const tabStates = new Map<number, TabState>();

// Open side panel on toolbar click. Manifest V3 requires this opt-in step.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.warn("[FitCheck] sidePanel setup failed:", err));

// ---- 1. Receive parsed products from content scripts ---------------------

onMessage("PDP_PARSED", async (msg, sender) => {
  const tabId = sender.tab?.id;
  if (tabId === undefined) return;

  // Log the extraction attempt regardless of success.
  await record({
    kind: "extraction_attempted",
    site: msg.result.product?.site ?? hostnameFromUrl(msg.tabUrl),
    ok: msg.result.ok,
    reason: msg.result.reason,
  });

  if (!msg.result.ok || !msg.result.product) {
    tabStates.set(tabId, { verdict: null, failure: msg.result });
    pushVerdict(tabId);
    return;
  }

  const product = msg.result.product;
  const profile = await getProfile();
  if (!profile) {
    // No profile yet — side panel will show its setup state when opened.
    tabStates.set(tabId, { product, verdict: null });
    pushVerdict(tabId);
    return;
  }

  const verdict = computeFit(product, profile);
  tabStates.set(tabId, { product, verdict });

  if (verdict) {
    await record({
      kind: "verdict_shown",
      site: msg.result.product.site,
      recommendedSize: verdict.recommendedSize,
      status: verdict.sizes.find((s) => s.size === verdict.recommendedSize)?.recommendation ?? "unknown",
    });
  }

  pushVerdict(tabId);
});

// ---- 2. Respond to side panel requests for current state ----------------

onMessage("REQUEST_VERDICT", async () => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) return { type: "VERDICT", verdict: null };
  const state = tabStates.get(activeTab.id);
  return {
    type: "VERDICT",
    product: state?.product,
    verdict: state?.verdict ?? null,
    failure: state?.failure,
  };
});

// ---- 3. Side panel events -----------------------------------------------

onMessage("PROFILE_SAVED", async (msg) => {
  await record({ kind: "profile_completed" });
  void msg;
  // Re-run fit math for every cached tab using the new profile. Gender
  // toggles in the profile change which products produce verdicts vs.
  // gender-mismatch states, so all tabs need re-evaluation.
  const profile = await getProfile();
  if (!profile) return;
  for (const [tabId, state] of tabStates.entries()) {
    if (!state.product) continue;
    const verdict = computeFit(state.product, profile);
    tabStates.set(tabId, { ...state, verdict });
  }
  // Push the active tab's new state so the panel updates immediately.
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id !== undefined) pushVerdict(activeTab.id);
});

onMessage("OVERRIDE", async (msg) => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await record({
    kind: "size_overridden",
    site: hostnameFromUrl(activeTab?.url),
    recommendedSize: msg.recommendedSize,
    chosenSize: msg.chosenSize,
  });
});

// ---- 4. Helpers ---------------------------------------------------------

function pushVerdict(tabId: number): void {
  const state = tabStates.get(tabId);
  chrome.runtime
    .sendMessage({
      type: "VERDICT",
      product: state?.product,
      verdict: state?.verdict ?? null,
      failure: state?.failure,
    })
    .catch(() => {
      // Side panel isn't open. That's fine — REQUEST_VERDICT will pull state when it opens.
    });
}

function hostnameFromUrl(url?: string): string {
  if (!url) return "unknown";
  try {
    return new URL(url).hostname.replace(/^www2?\./, "").split(".")[0];
  } catch {
    return "unknown";
  }
}

// Clean up stale tab state.
chrome.tabs.onRemoved.addListener((tabId) => tabStates.delete(tabId));

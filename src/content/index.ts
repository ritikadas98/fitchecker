/**
 * Content script entry point.
 *
 * Lifecycle:
 *   1. Injected on all matched URLs (see manifest.json content_scripts).
 *   2. Watches for URL changes (SPA nav) and re-runs extraction.
 *   3. When a URL is a PDP, finds the right adapter, parses, posts result
 *      to the background.
 *
 * The content script is intentionally thin — it doesn't compute anything
 * about fit. Its only responsibility is "given this page, what's the
 * product info?" The fit computation lives in the background worker.
 */

import { adapterFor } from "./adapters";
import { send } from "../lib/messages";
import { watchUrlChanges } from "./utils/observer";
import type { ExtractionResult } from "../lib/types";

// Version fingerprint — log on every injection so DevTools console can
// confirm which build is actually running on a given page. If chrome
// caches an older bundle, this is the canonical answer to "which version
// am I running?".
const FITCHECK_VERSION = "5.10";
console.log(`[FitCheck] content script v${FITCHECK_VERSION} loaded on ${location.hostname}`);

let lastUrl = "";
// Monotonic counter incremented on every URL change. Each attemptParse
// captures the value at call time; pending retries check it before parsing
// or sending so a navigation away cancels in-flight retry chains for the
// previous URL.
let urlGeneration = 0;

watchUrlChanges((url) => {
  if (url === lastUrl) return;
  lastUrl = url;
  const gen = ++urlGeneration;

  const adapter = adapterFor(url);
  if (!adapter) {
    console.log(`[FitCheck] ${url} → no adapter matched`);
    // Not a PDP. Inform background so it can clear any stale verdict.
    send({
      type: "PDP_PARSED",
      result: { ok: false, reason: "no_pdp" },
      tabUrl: url,
    });
    return;
  }

  console.log(`[FitCheck] ${url} → ${adapter.site} adapter, parsing...`);
  // Wait for the SPA to actually render the new route. The first paint of a
  // route change often arrives well after the URL change. We retry a few
  // times before giving up.
  attemptParse(adapter, url, 0, gen);
});

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 400;

function attemptParse(
  adapter: ReturnType<typeof adapterFor> & object,
  url: string,
  attempt: number,
  gen: number,
): void {
  if (gen !== urlGeneration) return; // superseded by a newer navigation

  let result: ExtractionResult;
  try {
    result = adapter.parse(document, url);
  } catch (err) {
    result = {
      ok: false,
      reason: "unknown_error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  // Retry on selectors_failed or no_size_chart_found — the page may not be
  // fully rendered yet. Don't retry on chart_was_image (deterministic) or
  // no_pdp (won't change without a URL change).
  const shouldRetry =
    !result.ok &&
    (result.reason === "selectors_failed" || result.reason === "no_size_chart_found") &&
    attempt < MAX_ATTEMPTS;

  if (shouldRetry) {
    console.log(
      `[FitCheck] attempt ${attempt + 1}/${MAX_ATTEMPTS + 1} failed (${
        !result.ok ? result.reason + ":" + result.detail : ""
      }), retrying in ${RETRY_DELAY_MS}ms`,
    );
    setTimeout(() => attemptParse(adapter, url, attempt + 1, gen), RETRY_DELAY_MS);
    return;
  }

  if (gen !== urlGeneration) return; // navigation happened during synchronous parse

  if (result.ok && result.product) {
    console.log(
      `[FitCheck] ✓ extracted on attempt ${attempt + 1}: ${result.product.sizes.length} sizes`,
      result.product,
    );
  } else if (!result.ok) {
    console.warn(
      `[FitCheck] ✗ giving up after ${attempt + 1} attempts:`,
      result.reason,
      result.detail,
    );
  }
  send({ type: "PDP_PARSED", result, tabUrl: url });
}

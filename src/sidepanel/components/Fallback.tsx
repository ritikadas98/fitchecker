import { record } from "../../lib/analytics";
import type { ExtractionResult } from "../../lib/types";

interface Props {
  failure?: ExtractionResult;
}

export function Fallback({ failure }: Props) {
  // No failure object means we're not on a supported PDP.
  if (!failure || failure.reason === "no_pdp") {
    return (
      <div className="fallback">
        <div className="fallback-icon" aria-hidden>○</div>
        <p className="fallback-title">Not on a product page</p>
        <p className="fallback-body">
          Open a product on Myntra, Ajio, or H&amp;M India to get a fit verdict.
        </p>
      </div>
    );
  }

  // Reason-specific copy.
  const { title, body } = copyFor(failure.reason);

  return (
    <div className="fallback">
      <div className="fallback-icon warn" aria-hidden>!</div>
      <p className="fallback-title">{title}</p>
      <p className="fallback-body">{body}</p>

      <div className="fallback-actions">
        <button
          className="secondary"
          onClick={() => {
            void record({ kind: "fallback_action", action: "open_chart" });
            // Best-effort: scroll the active tab to the size chart. Wired in v1.1.
          }}
          type="button"
        >
          Open size chart on page
        </button>
        <button
          className="ghost"
          onClick={() => {
            void record({ kind: "fallback_action", action: "manual_entry" });
            // Manual entry flow — v1.1.
          }}
          type="button"
        >
          Enter measurements manually
        </button>
      </div>

      <button
        className="report-link"
        onClick={() => void record({ kind: "fallback_action", action: "report_page" })}
        type="button"
      >
        Help us improve — report this page
      </button>
    </div>
  );
}

function copyFor(reason?: ExtractionResult["reason"]): { title: string; body: string } {
  switch (reason) {
    case "chart_was_image":
      return {
        title: "Couldn't read this size chart",
        body: "This product's size guide is in an image format we don't yet support.",
      };
    case "no_size_chart_found":
      return {
        title: "No size chart on this page",
        body: "We couldn't find a size chart for this product. You can enter measurements manually.",
      };
    case "no_sizes_listed":
      return {
        title: "No sizes available",
        body: "This product doesn't have selectable sizes — could be one-size or sold out.",
      };
    case "unsupported_units":
      return {
        title: "Unfamiliar size format",
        body: "We couldn't interpret the units in this size chart. We're working on it.",
      };
    case "selectors_failed":
      return {
        title: "Couldn't read the page",
        body: "This page is in a format we don't yet handle. Tap report to help us fix it.",
      };
    default:
      return {
        title: "Something went wrong",
        body: "We couldn't compute a verdict for this page.",
      };
  }
}

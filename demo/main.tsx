// Chrome shim MUST be imported first, before any module that touches
// chrome.* at load time (silhouette.ts builds its asset map on import,
// for example).
import "./src/shims/chrome";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DemoApp } from "./src/DemoApp";

// Reuse the production extension's side panel styles so FitVerdict /
// ProfileSetup look identical to the real thing, then layer the demo's
// Chrome-window styles on top.
import "../src/sidepanel/styles.css";
import "./src/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DemoApp />
  </StrictMode>,
);

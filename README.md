# FitCheck

Chrome extension that translates clothing size charts into personalized fit verdicts at the point of purchase. v1 supports Myntra, Ajio, and H&M India.

The user enters their measurements once. On a supported product page, the side panel shows a tinted silhouette per size with per-axis pins (bust, waist, hip, length where applicable) calling out which dimensions will be snug, perfect, or loose — and a single recommended size at the top.

## Install for local development

```bash
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Toggle **Developer mode** on (top right)
3. Click **Load unpacked** → select the `dist/` folder
4. Pin the extension to the toolbar
5. Open a product page on Myntra, Ajio, or www2.hm.com (English India locale)

After any source change, run `npm run build` again and click the refresh icon on the FitCheck card in `chrome://extensions`.

## Project structure

```
src/
├── background/
│   └── index.ts          # Service worker — owns profile, runs fit math, caches per-tab state
├── content/
│   ├── index.ts          # Content script entry — watches for SPA navigation
│   ├── adapters/
│   │   ├── types.ts      # SiteAdapter interface
│   │   ├── index.ts      # Adapter registry
│   │   ├── myntra.ts     # ★ Implemented — hydration-store extraction
│   │   ├── ajio.ts       # ★ Implemented — __PRELOADED_STATE__ extraction
│   │   └── hm.ts         # ★ Implemented — __NEXT_DATA__ + static size chart
│   └── utils/
│       ├── observer.ts   # URL change observer for SPAs
│       └── extractJson.ts # Brace-counting JSON extractor (Myntra + Ajio)
├── lib/
│   ├── types.ts          # Shared types across processes
│   ├── storage.ts        # chrome.storage.local wrapper
│   ├── messages.ts       # Typed message passing
│   ├── fit-math.ts       # Per-axis verdict math
│   ├── silhouette.ts     # Per-style pin layout config
│   ├── style.ts          # Garment style classifier
│   ├── tint.ts           # Canvas-based silhouette tinting
│   ├── hm-size-chart.ts  # H&M's published size chart (static)
│   └── analytics.ts      # Local event log
└── sidepanel/
    ├── index.html
    ├── main.tsx
    ├── App.tsx           # Three-state router
    ├── components/
    │   ├── ProfileSetup.tsx
    │   ├── FitVerdict.tsx
    │   ├── FitIndicators.tsx     # Pins + tags overlaid on silhouette
    │   ├── TintedComposite.tsx   # Runtime garment tinting
    │   └── Fallback.tsx
    └── styles.css
```

## Adding a new retailer

Three steps, in order:

1. Create `src/content/adapters/<retailer>.ts` implementing the `SiteAdapter` interface. See `ajio.ts` for the cleanest example.
2. Register it in `src/content/adapters/index.ts`.
3. Add the host to `manifest.json` under both `host_permissions` and `content_scripts.matches`.

No other files need to change. The fit math, silhouettes, tinting, and side panel all consume `ParsedProduct` shape — once your adapter emits a valid one, every downstream piece works automatically.

## How each adapter extracts data (v1)

The three adapters illustrate three different data architectures, and that variety is part of the v1 narrative:

- **Myntra** — global hydration via `window.__myx = {...}` script tag. Brace-counted JSON extraction. Has its own per-product size chart with measurements in inches. Cleanest data of the three.
- **Ajio** — Redux preload via `window.__PRELOADED_STATE__ = {...}`. Same brace-counting technique (shared util). Per-product size chart at `state.product.sizeData.sizechart[0].brickBrandSizes[]`, measurements in inches as strings (often with empty values for dims a brick category doesn't carry).
- **H&M India** — Next.js hydration via `<script id="__NEXT_DATA__" type="application/json">{...}</script>`. Identity and size labels come from the page; per-size body measurements do NOT — the size guide modal lazy-loads from api.hm.com after render, which a content-script-only architecture cannot fetch. The adapter falls back to H&M's standardized published size chart (shipped as static data in `lib/hm-size-chart.ts`) for bust/waist/hip, and pulls per-product garment length from `productAttributes.measurement` when available. This is less fidelity-preserving than per-product charts but accurate enough since H&M applies their chart uniformly.

## Why Westside isn't in v1

Investigated and intentionally scoped out. Westside (Shopify-based) exposes its size chart **only as a PNG image** in the size-guide drawer:

```html
<img id="sizeGuideImage"
     src="//www.westside.com/cdn/shop/files/STUDIOFIT_WOMEN_TOPWEAR-CM.png"
     data-inch="//www.westside.com/cdn/shop/files/STUDIOFIT_WOMEN_TOPWEAR-IN.png">
```

There are zero `<table>` tags in a Westside PDP and zero machine-readable bust/waist/hip values anywhere in the rendered HTML. A content-script architecture cannot OCR PNGs at runtime without external services, and adapters MUST NOT touch the network.

Two paths to add Westside in a future iteration:

1. **Static-chart capture** — same approach used for H&M. Capture the `STUDIOFIT_*` PNGs once (women's topwear, bottomwear, dresses; men's topwear, bottomwear), transcribe the values manually into a `lib/westside-size-chart.ts` module, and ship as static data. Westside's "Studio Fit" sizing has been stable.
2. **OCR via background script** — the service worker could fetch and OCR the size-guide PNG (e.g. via a Tesseract.js bundle), since the network restriction applies only to adapters running in content scripts. Larger architectural change, useful only if more than one retailer follows this pattern.

This is a documented v1 scope decision, not an oversight.

## Debugging adapters

When an adapter selector breaks (a retailer ships a redesign, etc.):

1. Open a PDP on the affected site
2. Open the side panel — it shows the fallback state with a brief message
3. Open `chrome://extensions`, find FitCheck, click **Service worker** to open its DevTools
4. The console shows `[FitCheck]` logs including the `reason` and `detail` strings from the failed `ExtractionResult`. Each adapter's failure modes are documented at the top of its `.ts` file with their exact strings — that's how you map an error back to the broken extraction path.
5. Update the selector / path in the adapter file. Run `npm run build`, refresh the extension card.

## What's NOT in v1

Intentionally scoped out:

- Image-based size charts (OCR) — see Westside section above
- `chrome.storage.sync` (cross-device profile)
- External analytics
- A debug page for the event log
- Mobile support

## Roadmap (post-v1)

In priority order:

1. **Soak test on real PDPs** for all three retailers — verify silhouette/pin alignment and verdict accuracy against actual fit experience.
2. **Westside via static chart capture** if user demand justifies it.
3. **A debug page** to visualize the analytics events (`src/lib/analytics.ts` `Event` type).
4. **First verdict-tone experiment** — A/B between two phrasings of "may work" verdicts.
5. **Background-script SPA re-extraction** — currently the side panel asks the user to refresh after profile edits or product changes; a smarter content-script observer could re-extract automatically.

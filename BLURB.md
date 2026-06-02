# FitCheck

**What it is.** A Chrome extension that turns retailer size charts into a personalized fit verdict at the point of purchase. Built for Indian fashion shoppers on Myntra, AJIO, and H&M India.

**The core insight.** Apparel return rates in India sit at roughly 25 to 30 percent, and sizing is the leading driver. Every product page already shows a size chart, so the chart isn't the problem; trusting it is. A "36 inch bust" on the chart doesn't tell you whether your 34 inch bust will look snug, perfect, or roomy on *this particular cut*. FitCheck doesn't replace the chart. It translates it into a verdict the shopper can act on, with a per-axis breakdown of *why*.

**What I built.** Three retailer adapters, each handling a different size-data architecture (Myntra hydration store, AJIO Redux preload, H&M India Next.js plus a static chart fallback for measurements the page doesn't ship). Shared fit math that is ease-aware for tops and dresses (so oversized cuts aren't mis-flagged as too tight) and body-chart-based for bottoms. A side-panel UI with a silhouette and per-axis pins that visually mirror the math.

**One hard tradeoff.** Westside is excluded from v1. They publish their size chart as a PNG image only, not as machine-readable data. Adding OCR support would have been days of work for one retailer, against an architecture rule that adapters never touch the network. I scoped Westside out, documented why, and laid out two concrete paths for adding it later. Saying a defensible no is part of the work.

**Status.** v0.6.0, shipped as a portfolio release.

- Interactive demo: https://fitcheck-demo.netlify.app
- Repo: https://github.com/ritikadas98/fitchecker
- Install: download the latest release zip from the repo's Releases page and "Load unpacked" in Chrome.

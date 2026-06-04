# FitCheck — PM Decisions

A running log of the product decisions behind FitCheck, with the reasoning, so the case
study, the deck, and interview prep all draw from one source of truth — and so the next
person (or the next me) sees the *why*, not just the conclusion. Format per entry:
**Decision / Rationale / Implication.**

---

## 1. Positioning & thesis

### FC.1 — Fit confidence is a *visual* problem, not a precision problem
**Decision:** FitCheck's job is to give a quick visual fit *signal*, not an accurate
measurement. It answers "will this likely fit?" — never "will this fit perfectly?"
**Rationale:** Every product page already has a size chart, so accuracy isn't the gap —
*trust* is. A "36-inch bust" entry doesn't tell you how your body sits in a specific cut.
Users want to see how a garment will fit, not do mental math.
**Implication:** Drives the three-tier verdict, the tinted silhouette, and the refusal to
over-promise. Any feature that chases precision over confidence (3D scan, AR try-on) is
off-thesis by definition.

### FC.2 — A decision aid, not a guarantee
**Decision:** FitCheck is explicitly framed as a decision aid that can be wrong, not an
authority.
**Rationale:** Over-claiming accuracy destroys trust the first time it's wrong. Setting a
fit *range* expectation (snug / regular / loose) is more honest and more durable.
**Implication:** Tone and copy stay hedged where the data is uncertain; the engine abstains
rather than fabricating a verdict when a dimension is missing (see FC.13).

---

## 2. Form factor & reach

### FC.3 — A browser extension, not a single-retailer feature
**Decision:** Build a cross-retailer Chrome extension rather than the original Myntra-only
feature concept (Assignment 2).
**Rationale:** You can't ship inside Myntra's product page without being Myntra. An
extension is the only way to test the fit-verdict hypothesis across real retailers
*independently* — which is what turns a single-retailer feature idea into a product.
Scope, use, and reach all increase.
**Implication:** The original Myntra pitch becomes the v0 concept; the extension becomes the
proof. The endgame (FC.27) closes the loop by licensing the engine back to retailers.

### FC.4 — Target the desktop / big-screen shopper as the v1 wedge
**Decision:** Aim the extension at people who shop on a laptop/PC, not mobile.
**Rationale:** Considered apparel purchases — the ones where fit uncertainty bites — often
happen on a big screen where people comparison-shop and study what they're buying. It's a
real, reachable segment, and an extension only runs on desktop browsers anyway.
**Implication:** Desktop is honestly the *minority* of Indian fashion traffic (~60% is
mobile), so the extension is a validation wedge, not the end product — which is the explicit
reason the roadmap ends in a retailer-side SDK that reaches every surface (FC.23).

---

## 3. Retailers & coverage

### FC.5 — Myntra, AJIO, and H&M India as the first three
**Decision:** Support these three retailers in v1.
**Rationale:** They're the most popular fashion destinations for urban India, where the
desktop-shopper segment lives — so they maximize reach for a v1.
**Implication:** Retailer choice is a *reach* decision, not a technical one.

### FC.6 — The three data architectures are a discovered proof-of-pattern, not the selection reason
**Decision:** Frame the variety across retailers (Myntra hydration store, AJIO Redux
preload, H&M Next.js + static fallback) as evidence the adapter pattern generalizes.
**Rationale:** Honest framing: the retailers were picked for reach; the data-shape variety
was discovered and then leaned into. It's a legitimate point because three completely
different data sources normalize into one shape — proving the abstraction holds.
**Implication:** Adding a retailer is "write one adapter that emits `ParsedProduct`," and the
rest of the app is untouched. Use this as the answer to "how does this scale to more sites?"

### FC.7 — Westside scoped out (wanted, but blocked)
**Decision:** Don't support Westside in v1, despite wanting to.
**Rationale:** Westside is popular with the middle-range urban-Bangalore shopper, so it's a
real want. But its size chart ships *only* as a PNG image — zero machine-readable values —
and adapters must not touch the network (FC.10), so there's no way to read it at runtime.
**Implication:** Documented as a deliberate scope-out with two future paths (static-chart
capture like H&M, or OCR in the background script). A scoping example, not a gap.

---

## 4. Architecture

### FC.8 — Per-retailer adapters normalize to one `ParsedProduct`
**Decision:** Each retailer gets an adapter that extracts its data and emits a single
normalized `ParsedProduct` shape; everything downstream consumes only that shape.
**Rationale:** Isolates retailer-specific messiness at the edge so the fit math, silhouettes,
tinting, and UI never need to know which site they're on.
**Implication:** New retailers are additive and low-risk; downstream code is stable.

### FC.9 — Three processes, each scoped to one job
**Decision:** Content script + adapters read the page; the background service worker owns the
profile, runs the fit math, and caches per-tab state; the side panel renders.
**Rationale:** Clear separation of concerns; the verdict is computed once, server-of-record
style, in the worker rather than in the UI.
**Implication:** State and math live in one place; the UI stays a pure renderer.

### FC.10 — Adapters must never touch the network
**Decision:** A hard rule: content-script adapters read only from the already-rendered page,
never make network calls.
**Rationale:** Privacy and trust (an extension silently fetching is a red flag), and
reliability (no dependency on external endpoints from a content script).
**Implication:** Forced the H&M static-chart fallback (its real chart lazy-loads from an API)
and the Westside scope-out. The constraint is a feature, not a workaround.

---

## 5. Fit-math model

### FC.11 — Ease-aware: body-chart numbers vs garment-flat numbers
**Decision:** The engine distinguishes the body a size *targets* (body chart) from the
garment's *actual* measurement (garment flat); the gap encodes designer intent.
**Rationale:** It's the difference between a chart and a verdict. 2 inches of ease is slim,
8 is oversized — so an oversized tee on a 36-inch bust reads as *loose*, not tight, even
though the chart targets a 32-inch body.
**Implication:** This is the real IP and the hardest part to explain; lead with it in
technical interviews.

### FC.12 — Axis counts by garment type; bottoms are body-chart-only
**Decision:** Tops two-axis (width + length), dresses four-axis (bust + waist + hip +
length), bottoms body-chart-only.
**Rationale:** Bottoms typically have no positive ease at the waist (denim is often negative
ease / stretch), so garment-flat ease modeling doesn't apply there.
**Implication:** Keeps the model honest per category instead of forcing one formula.
**Update (this batch):** Also skip the hip axis on flared-hem styles (`crop_top`,
`tunic`, `kurta_short`, `kurta_long`, `anarkali`). On these the chart's hip column
describes the loose hem, not a body-fit constraint, so scoring it would flag a false
problem.

### FC.13 — Abstain rather than fabricate
**Decision:** When a required dimension is missing (e.g., no garment length from the page),
return a fallback state instead of a confident verdict.
**Rationale:** A confident-but-baseless verdict is worse than "we can't tell here" — it's the
FC.2 honesty principle applied to missing data.
**Implication:** A natural place to add graded confidence later ("less sure — no hip data").

---

## 6. Verdict & UX

### FC.14 — Three tiers: recommended / may work / not recommended
**Decision:** Resolve every verdict to one of three tiers.
**Rationale:** *Recommended* = fits as designed (all axes on target). *May work* = about one
size off — wearable, and fine if you like it a touch loose or snug; the honest middle that
respects real preference variance. *Not recommended* = two-plus sizes off, a squeeze or sag
you wouldn't buy. Three tiers (not a binary) refuse a precision the data can't support.
**Implication:** "May work" is the tier that earns trust; don't collapse it into a yes/no.
**Update (this batch):** Softened the not-recommended rule. Old: any single "poor" axis
→ not recommended. New: a *strict majority* of axes must be poor. So 2 good + 1 poor now
reads "may work" with the bad axis named in the headline (and still flagged with a red dot
in the per-axis breakdown), instead of blaring red. This makes "may work" do the honest
work it's meant to — one off-axis isn't a veto.

### FC.15 — Recommend an action, don't describe a feeling
**Decision:** Use recommendation language (recommended / may work / not recommended) rather
than the Assignment 2 descriptors (comfort / relaxed / loose).
**Rationale:** Those describe *how it feels*; the user's actual question at purchase is
"should I buy this size?" A recommendation is more actionable and matches the decision-aid
thesis (FC.2).
**Implication:** Copy throughout is prescriptive, anchored on the size decision.

### FC.16 — Gender-specific silhouette = the garment's body-block, not the user's identity
**Decision:** Offer male/female silhouettes in v1, keyed to the garment's section.
**Rationale:** Apparel retail is organized into gendered sections drafted to different body
blocks, and people shop from a section regardless of how they identify. So the toggle is
really "which body-block / size chart does this garment use" — it mirrors the retailer's own
catalogue structure, so it works wherever their chart works.
**Implication / honest limit:** A two-block model underserves bodies that don't match the
block their section uses (non-binary shoppers, and many binary bodies too). The principled
**v2 is measurements-first** — drive the silhouette purely from body measurements + the
garment's actual block, decoupling fit from the gender label entirely. The calibration and
measurement-driven engine (FC.24) already point that way.

### FC.17 — Tinted silhouette + per-axis pins as the output
**Decision:** Render the verdict as a tinted body silhouette with pins on the axes that are
snug / perfect / loose.
**Rationale:** A visual signal reduces cognitive load and matches the "see how it fits"
insight (FC.1) better than a number or a table.
**Implication:** Garment silhouette assets are gendered + category-specific; new categories
need new assets.

### FC.18 — Past-purchase check on Myntra order history
**Decision:** On Myntra order-history pages (which expose the size previously bought), compare
the recommendation against it — green "matches your previous order" or amber "you bought M,
the math now recommends L."
**Rationale:** Ground-truth accountability: the recommendation is checked against a size the
user actually wore, and stays honest when the body has shifted rather than rubber-stamping
the past.
**Implication:** A seed of brand-level fit memory (a roadmap item) and a strong demo moment.

---

## 7. Data, privacy & demo

### FC.19 — Profile in `chrome.storage.local`, no account, no sync
**Decision:** Store the user's measurements locally; no login, no cross-device sync in v1.
**Rationale:** Avoids an auth surface and a privacy-policy review before there are any users;
keeps all body data on-device.
**Implication:** Cross-device sync is a known v2 ask that adds an auth surface deliberately
deferred.

### FC.20 — Analytics are local-only (event log), no external vendor
**Decision:** A local ring-buffer event log (`extraction_attempted`, `verdict_shown`,
`size_overridden`, `profile_completed`, `fallback_action`); swap to a vendor later without
changing call sites.
**Rationale:** No server, vendor, or privacy review needed pre-users; the events are designed
as the future metrics dimensions.
**Implication:** Override rate is already instrumented locally; verdict-to-purchase needs
retailer data and waits for the pilot (FC.23). The fit-outcome signal is being added (FC.25).

### FC.21 — A standalone demo harness with real fixtures
**Decision:** Ship a Netlify-deployed demo (Chrome-window mock + ten real product fixtures)
that runs the *real* fit math, alongside the installable extension.
**Rationale:** A no-install, ~30-second evaluation path for reviewers/recruiters; the
two-minute install path is for people who want to see it on live pages.
**Implication:** The fixtures double as the eval harness's golden set (FC.25).

---

## 8. Metrics & growth

### FC.22 — North Star, counter-metric, activation
**Decision:** North Star = verdict-to-purchase conversion; counter-metric = override rate;
activation = profile completion within 24h.
**Rationale:** Verdict-to-purchase is the metric a retailer would pay for (it maps to fewer
size-driven returns). Override rate is the cleanest trust proxy and the one most fit tools
forget. Profile completion is the make-or-break step — the hypothesised top predictor of
week-4 retention.
**Implication:** Override is measurable today; verdict-to-purchase can't be measured from a
content script without retailer data — naming that dependency is the honest move.

### FC.23 — Consumer wedge, B2B endgame (the MAU ladder)
**Decision:** Grow as: instrument at 1k MAU → verdict-tone A/B at 10k → returns-measurement
pilot with one retailer (AJIO first, cleanest data) at 50k → license the fit engine as a
retailer-side SDK at 100k.
**Rationale:** The extension validates the hypothesis on the surface it can reach; the real
business runs natively on the retailer's page (and reaches mobile), with the extension as the
proof point. This closes the loop on the original "why a retailer should build this" pitch.
**Implication:** The consumer extension is explicitly the proof point, not the product.

---

## 9. Active add-ons (shipped this batch — verified independently)

### FC.24 — Calibrate the profile from a known-good item
**Decision:** Let users seed measurements from a product they know fits — read the
body-chart row for the size that fit and write it into the profile — instead of (or
alongside) entering raw measurements.
**Rationale:** Most people don't know their bust/waist/hip, which is the activation bottleneck
(FC.22). They *do* know what fits. Reading the body-chart values (not the label) also
sidesteps the misleading-label problem the Levi's case is built on — it trusts the chart, not
the "M."
**Implication:** Scoped to supported-retailer products only (no measurement database). Reuses
the existing extraction, `ParsedProduct.measurements`, and `Profile` shape — no schema change.

### FC.25 — Local fit-outcome feedback
**Decision:** Add a "did it fit?" capture (fit / too tight / too loose) as a local
`fit_outcome` event.
**Rationale:** Override is logged but the actual outcome isn't — this is the missing signal
that turns "calibrated against my own returns" into "instrumented to learn," and it's the
direct answer to "how accurate at scale?"
**Implication:** Local-only for now (FC.20); pairs with calibration (seed from a trusted
garment, then refine from outcomes).

### FC.26 — Verdict eval harness (golden set)
**Decision:** A regression test that runs the *real* fit math against the ten fixtures with
authored expected verdicts (recommended size + tier).
**Rationale:** Locks in the behaviours that matter (the Levi's 28 case, the ease-aware
oversized-tee case) so an adapter or math change can't silently regress accuracy. The
FitCheck analogue of a working eval.
**Implication:** Imports the single fit-math source (never a copy); runnable via a script.
**Status:** Shipped. `npm run eval`, vitest, 11 (fixture × profile × expected) rows across
all 10 fixtures, 12/12 green. Two README-highlighted cases locked: Levi's 28-waist body →
recommends 28; Flying Machine on a 36-inch chest → not flagged too tight.

---

## Open questions / not yet decided

- Fit-preference handling in calibration: treat "fits well" as the body-chart target (v1), or
  add a snug / perfect / loose toggle that nudges the inferred values (v2)?
- Graded confidence surfacing when data is partial (extends FC.13 beyond abstain).
- Brand-level fit memory: how much to personalise from override + fit-outcome history.
- Fabric/stretch-aware tolerance: only if material composition is reliably on the PDP.
- When real users arrive: the verdict-to-purchase measurement path (needs retailer
  cooperation — the 50k pilot).

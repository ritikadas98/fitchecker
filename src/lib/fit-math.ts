/**
 * Fit math.
 *
 * Inputs:  Profile (user body) + ParsedProduct (chart + style)
 * Output:  FitVerdict with per-size, per-axis analysis
 *
 * Two paths:
 *   - Tops & bottoms: two-axis (width + length).
 *   - Dresses: four-axis (bust + waist + hip + length).
 *
 * Width logic is shared. Length logic is style-aware via BASELINE_BY_STYLE.
 * Recommendation tier: "perfect"/"good" on all axes → recommended; any axis
 * "poor" → not_recommended; otherwise may_work.
 */

import type {
  AxisVerdict,
  Category,
  FitVerdict,
  GarmentStyle,
  ParsedProduct,
  Profile,
  Recommendation,
  SizeFit,
} from "./types";

interface Baseline { female: number; male: number; }

const BASELINE_BY_STYLE: Record<GarmentStyle, Baseline> = {
  // Tops — calibrated against actual Indian fashion catalog data.
  crop_top:     { female: 17, male: 18 },
  top_regular:  { female: 24, male: 27 },
  tunic:        { female: 29, male: 31 },
  kurta_short:  { female: 34, male: 36 },
  kurta_long:   { female: 42, male: 44 },
  anarkali:     { female: 50, male: 50 },
  // Bottoms (inseam). Calibrated for an Indian fast-fashion target user.
  // Female baseline anchored at 5'4" (64") with 28.4" expected inseam, so
  // a 5'2" body expects ~27.8" — making 27"/28" inseam read as "good", not
  // "short". Male baseline preserves the 32" anchor since the screenshots
  // confirmed men's verdicts were calibrated correctly already.
  trousers:     { female: 28.4, male: 32 },
  jeans:        { female: 28.4, male: 32 },
  shorts:       { female: 7,    male: 9 },
  skirt:        { female: 22,   male: 22 },
  // Dresses (overall length, hem)
  dress_short:  { female: 36, male: 36 },
  dress_long:   { female: 52, male: 52 },
  // Fallbacks
  unknown_top:    { female: 26,   male: 28 },
  unknown_bottom: { female: 28.4, male: 32 },
  unknown_dress:  { female: 40,   male: 40 },
};

const HEIGHT_ANCHOR = { female: 64, male: 69 } as const;
const LENGTH_SCALE_PER_INCH = 0.3;

function expectedLength(style: GarmentStyle, gender: "male" | "female", heightInches: number): number {
  const anchor = HEIGHT_ANCHOR[gender];
  const baseline = BASELINE_BY_STYLE[style][gender];
  return baseline + (heightInches - anchor) * LENGTH_SCALE_PER_INCH;
}

// === Width analysis ======================================================
//
// Two-mode design:
//
//   Mode A (ease-aware, used for tops & dresses):
//     We have garmentFlat (actual garment circumference) and bodyChart
//     (the "fits a body of X" value). The DESIGNED EASE is the difference
//     — for a slim t-shirt this is ~2", for an oversized cut it's 6-10".
//     The verdict compares ACTUAL EASE the user gets (garmentFlat -
//     userBody) against DESIGNED EASE. This makes verdicts auditable
//     against the page (the user-visible "Bust 40in" is what the math
//     actually uses) and stops us from flagging an oversized t-shirt
//     "too tight" just because the body chart targets a smaller body.
//
//     Myntra exposes both columns directly. Ajio and H&M expose only
//     the body chart, so we INFER designed ease from the garment style
//     + title keywords ("oversized" → 8", "slim" → 1", default → 3").
//
//   Mode B (body-chart only, used for bottoms):
//     Bottoms are measured at the waist where there's typically no ease
//     (or even negative ease for stretch denim). Body chart vs user is
//     the right comparison and the existing thresholds work fine.

interface WidthInputs {
  category: Category;
  axisLabel: string;
  /** "To Fit Bust" / "To Fit Waist" value — the body the size was designed for. */
  bodyChart?: number;
  /** "Bust" / "Waist" value — the actual garment circumference. */
  garmentFlat?: number;
  userBody: number;
  /** Used to infer designed ease when garmentFlat is missing. */
  garmentStyle: GarmentStyle;
  title: string;
}

function describeIntent(designedEase: number): string {
  if (designedEase < 1.5) return "slim-fit";
  if (designedEase < 4) return "regular-fit";
  if (designedEase < 7) return "relaxed";
  return "oversized";
}

/**
 * Look at the title for explicit fit signals. These trump style-based
 * defaults because the seller has explicitly told us the cut.
 */
function inferDesignedEase(garmentStyle: GarmentStyle, title: string): number {
  const t = title.toLowerCase();
  if (/\boversized\b|\bboxy\b|\bloose\s*fit\b/.test(t)) return 8;
  if (/\bslim\s*fit\b|\bbody\s*fit\b|\bfitted\b/.test(t)) return 1.5;
  if (/\brelaxed\b/.test(t)) return 5;
  // Style-based defaults — calibrated against typical Indian retail cuts.
  switch (garmentStyle) {
    case "crop_top":     return 1.5;
    case "tunic":        return 4;
    case "kurta_short":
    case "kurta_long":   return 5;
    // Real anarkali cuts are fitted at the bust and flare from the
    // empire waist. The original v1 default of 8" treated every
    // anarkali like an oversized tee, which mis-flagged regular-fit
    // anarkalis (e.g. MOKOSH, Inddus) as having "way too little ease"
    // even when the user's body bust matched the garment bust exactly.
    // 3" matches typical Indian-retail anarkali bust ease; products
    // that are genuinely oversized still get caught by the title-keyword
    // override above (\boversized\b → 8").
    case "anarkali":     return 3;
    case "dress_short":
    case "dress_long":   return 3;
    case "top_regular":
    case "unknown_top":
    case "unknown_dress":
    default:             return 3;
  }
}

function analyzeWidth(inputs: WidthInputs): AxisVerdict {
  // ---- Bottoms keep the body-chart comparison ----------------------------
  if (inputs.category === "bottom") {
    const widthDiff = (inputs.bodyChart ?? inputs.garmentFlat ?? inputs.userBody) - inputs.userBody;
    if (widthDiff < -2) return {
      status: "poor", diff: widthDiff,
      headline: "Waist too tight",
      detail: "Will be uncomfortable at the waist. Sizing up is recommended.",
    };
    if (widthDiff < -0.5) return {
      status: "okay", diff: widthDiff,
      headline: "Snug at waist",
      detail: "Sits close. Fitted look at the waist.",
    };
    if (widthDiff <= 1) return {
      status: "perfect", diff: widthDiff,
      headline: "Waist on target",
      detail: "Waist measurement matches yours closely.",
    };
    if (widthDiff <= 2) return {
      status: "good", diff: widthDiff,
      headline: "Comfort waist",
      detail: "Slight ease at the waist.",
    };
    return {
      status: "poor", diff: widthDiff,
      headline: "Loose at waist",
      detail: "Roomy at the waist — may need a belt.",
    };
  }

  // ---- Tops & dresses: ease-aware ----------------------------------------
  // Establish bodyChart and garmentFlat. If only one is available, infer
  // the other from typical designed ease for the style/title.
  let bodyChart = inputs.bodyChart;
  let garmentFlat = inputs.garmentFlat;
  let easeIsInferred = false;

  if (bodyChart !== undefined && garmentFlat === undefined) {
    const e = inferDesignedEase(inputs.garmentStyle, inputs.title);
    garmentFlat = bodyChart + e;
    easeIsInferred = true;
  } else if (garmentFlat !== undefined && bodyChart === undefined) {
    const e = inferDesignedEase(inputs.garmentStyle, inputs.title);
    bodyChart = garmentFlat - e;
    easeIsInferred = true;
  } else if (bodyChart === undefined && garmentFlat === undefined) {
    // Shouldn't happen — caller is supposed to early-return when both missing.
    return {
      status: "okay", diff: 0,
      headline: "Size data unclear",
      detail: "Couldn't read this size's measurements.",
    };
  }

  const designedEase = garmentFlat! - bodyChart!;
  const actualEase = garmentFlat! - inputs.userBody;
  const easeGap = actualEase - designedEase; // how much ease user gets vs designer intent
  const intent = describeIntent(designedEase);
  const lower = inputs.axisLabel.toLowerCase();

  // Hard physical squeeze — garment narrower than body.
  if (actualEase < -0.5) {
    return {
      status: "poor", diff: actualEase,
      headline: `${inputs.axisLabel} too tight`,
      detail: easeIsInferred
        ? `This size is meant for a ${bodyChart!.toFixed(0)}" ${lower}; you're ${inputs.userBody.toFixed(0)}". Will physically pull. Size up.`
        : `Garment ${lower} is ${garmentFlat!.toFixed(1)}", your ${lower} is ${inputs.userBody.toFixed(1)}". Will physically pull. Size up.`,
    };
  }

  // Less ease than designer intended. Severity depends on how much less
  // AND on how oversized the design itself was — losing 4" of ease on an
  // oversized cut still leaves the garment roomy; losing 2" on a slim cut
  // makes it uncomfortable.
  if (easeGap < -3) {
    // Significantly less ease than intended. Still wearable as long as
    // actualEase >= 0 (no squeeze) — flag as "okay" not "poor".
    const stillRoomy = actualEase >= 2;
    return {
      status: stillRoomy ? "okay" : "poor",
      diff: easeGap,
      headline: stillRoomy ? `Closer than the ${intent} intent` : `${inputs.axisLabel} too tight`,
      detail: easeIsInferred
        ? `This size is designed for a ${bodyChart!.toFixed(0)}" ${lower} (typical ${intent} cut). For your ${inputs.userBody.toFixed(0)}", it'll fit closer than intended. Sizing up restores the ${intent} silhouette.`
        : `Designed for a ${bodyChart!.toFixed(0)}" ${lower} with ~${designedEase.toFixed(0)}" of ease (${intent}). On your ${inputs.userBody.toFixed(0)}", you get ${actualEase.toFixed(1)}" of ease — closer than intended. Size up for the ${intent} look.`,
    };
  }

  if (easeGap < -1) {
    return {
      status: "good", diff: easeGap,
      headline: "Slightly closer than intended",
      detail: `~${actualEase.toFixed(1)}" of ease on you, vs ${designedEase.toFixed(0)}" the cut was designed for (${intent}). Wearable as-is, just a touch fitted.`,
    };
  }

  if (Math.abs(easeGap) <= 1) {
    return {
      status: "perfect", diff: easeGap,
      headline: "Designed fit",
      detail: easeIsInferred
        ? `Matches the ${intent} fit this size was designed for.`
        : `Matches the ${intent} silhouette this size was designed for (~${actualEase.toFixed(1)}" ease).`,
    };
  }

  if (easeGap <= 3) {
    return {
      status: "good", diff: easeGap,
      headline: "Slightly looser than intended",
      detail: `~${actualEase.toFixed(1)}" of ease on you, vs ${designedEase.toFixed(0)}" the cut was designed for (${intent}). Comfortable, a touch roomier.`,
    };
  }

  // Significantly looser than intended. For oversized cuts the user might
  // actually want this; for slim cuts it's a clear "size down".
  return {
    status: designedEase >= 5 ? "okay" : "poor",
    diff: easeGap,
    headline: "Looser than intended",
    detail: `~${actualEase.toFixed(1)}" of ease on you, vs ${designedEase.toFixed(0)}" the cut was designed for (${intent}). Will look bigger than intended — size down if you want the designed silhouette.`,
  };
}

// === Length analysis (style-aware) =======================================

function analyzeLength(style: GarmentStyle, lengthDiff: number): AxisVerdict {
  const abs = Math.abs(lengthDiff);
  const sitsAt = sitsAtCopy(style);

  // Tops/dresses use wider tolerances since "regular" length varies broadly.
  // Bottoms use tighter tolerances because inseam length is more standardized.
  const isTopOrDress = !["trousers", "jeans", "shorts", "skirt", "unknown_bottom"].includes(style);
  const tightBound = isTopOrDress ? 3 : 2;
  const looseBound = isTopOrDress ? 7 : 4;

  if (lengthDiff < -looseBound) return {
    status: "poor", diff: lengthDiff,
    headline: "Runs short",
    detail: `~${abs.toFixed(0)}" shorter than typical for ${sitsAt}. Will sit higher than expected.`,
  };
  if (lengthDiff < -tightBound) return {
    status: "okay", diff: lengthDiff,
    headline: "Slightly short",
    detail: `~${abs.toFixed(0)}" shorter than usual for ${sitsAt}. Acceptable if you prefer cropped silhouettes.`,
  };
  if (lengthDiff > looseBound) return {
    status: "poor", diff: lengthDiff,
    headline: "Runs long",
    detail: `~${abs.toFixed(0)}" longer than typical for ${sitsAt}. Will fall lower than expected.`,
  };
  if (lengthDiff > tightBound) return {
    status: "okay", diff: lengthDiff,
    headline: "Slightly long",
    detail: `~${abs.toFixed(0)}" longer than usual for ${sitsAt}. Fine if you like a longer drop.`,
  };
  return {
    status: "perfect", diff: lengthDiff,
    headline: "Good length",
    detail: `Sits where it should for ${sitsAt}.`,
  };
}

function sitsAtCopy(style: GarmentStyle): string {
  switch (style) {
    case "crop_top":     return "a crop top (at or above the waist)";
    case "top_regular":  return "this style (mid-hip)";
    case "tunic":        return "a tunic (lower hip)";
    case "kurta_short":  return "a short kurta (mid-thigh)";
    case "kurta_long":   return "a long kurta (knee-length)";
    case "anarkali":     return "an Anarkali (mid-calf to ankle)";
    case "trousers":     return "trousers";
    case "jeans":        return "jeans";
    case "shorts":       return "shorts";
    case "skirt":        return "this skirt length";
    case "dress_short":  return "a knee-length dress";
    case "dress_long":   return "a maxi dress";
    default:             return "this style";
  }
}

// === Fit name & recommendation derivation ================================

function fitNameFromAxes(axes: AxisVerdict[]): string {
  // Skip axes whose data we couldn't read — they shouldn't drive the
  // overall fit name.
  const known = axes.filter((a) => a.status !== "unknown");
  // Worst axis wins. This keeps the fitName consistent with the
  // recommendation chip — a panel that says "May work for you" should
  // never display "Perfect fit" alongside it.
  const poor = known.find((a) => a.status === "poor");
  if (poor) return poor.headline;
  const okay = known.find((a) => a.status === "okay");
  if (okay) return okay.headline;
  if (known.length === 0) return "Limited data";
  // All known axes perfect/good.
  if (known.every((a) => a.status === "perfect")) return "Perfect fit";
  return "Comfort fit";
}

function recommendFromAxes(axes: AxisVerdict[]): Recommendation {
  // Unknown axes don't count as known evidence either way. We need at
  // least one known axis with a verdict to make a recommendation; if all
  // axes are unknown, fall back to may_work (the user has no signal).
  const known = axes.filter((a) => a.status !== "unknown");
  if (known.length === 0) return "may_work";
  if (known.some((a) => a.status === "poor")) return "not_recommended";
  if (known.every((a) => a.status === "perfect" || a.status === "good")) return "recommended";
  return "may_work";
}

// === Per-size assembly ===================================================

function fitForSize(
  product: ParsedProduct,
  profile: Profile,
  size: string,
): SizeFit | null {
  const garment = product.measurements[size];
  if (!garment) return null;
  const garmentFlatRow = product.garmentMeasurements?.[size];

  // ============================================================
  // DRESSES — four-axis (bust, waist, hip, length)
  // ============================================================
  if (product.category === "dress") {
    const bodyBust = product.gender === "female" ? garment.bust : garment.chest;
    const bodyWaist = garment.waist;
    const bodyHip = garment.hip;
    const garmentFlatBust = garmentFlatRow?.bust ?? garmentFlatRow?.chest;
    const garmentFlatWaist = garmentFlatRow?.waist;
    const garmentFlatHip = garmentFlatRow?.hip;
    const garmentLen = garment.length;

    // Bust is the primary axis for dresses. We need at least one source —
    // body chart OR garment flat. analyzeWidth's ease-aware path can infer
    // the other half from style/title when only one column is present
    // (this is what Marks & Spencer products on Myntra hit: they ship
    // ONLY Garment Measurement rows, no "To Fit Bust"). Without either,
    // we genuinely have nothing to compare.
    if (bodyBust === undefined && garmentFlatBust === undefined) return null;

    const bustVerdict = analyzeWidth({
      category: "dress",
      axisLabel: "Bust",
      bodyChart: bodyBust,
      garmentFlat: garmentFlatBust,
      userBody: profile.upperBody,
      garmentStyle: product.garmentStyle,
      title: product.title,
    });

    const waistVerdict = (bodyWaist !== undefined || garmentFlatWaist !== undefined)
      ? analyzeWidth({
          category: "dress",
          axisLabel: "Waist",
          bodyChart: bodyWaist,
          garmentFlat: garmentFlatWaist,
          userBody: profile.waistInches,
          garmentStyle: product.garmentStyle,
          title: product.title,
        })
      : undefined;

    let hipVerdict: AxisVerdict | undefined;
    if (
      (bodyHip !== undefined || garmentFlatHip !== undefined) &&
      profile.hipInches !== undefined
    ) {
      hipVerdict = analyzeWidth({
        category: "dress",
        axisLabel: "Hip",
        bodyChart: bodyHip,
        garmentFlat: garmentFlatHip,
        userBody: profile.hipInches,
        garmentStyle: product.garmentStyle,
        title: product.title,
      });
    }

    let lengthVerdict: AxisVerdict;
    if (garmentLen === undefined) {
      lengthVerdict = {
        status: "unknown",
        diff: 0,
        headline: "Length info unavailable",
        detail: "This product doesn't list a length measurement. Verdict is based on bust/waist/hip only.",
      };
    } else {
      const expectedLen = expectedLength(product.garmentStyle, profile.gender, profile.heightInches);
      const lengthDiff = garmentLen - expectedLen;
      lengthVerdict = analyzeLength(product.garmentStyle, lengthDiff);
    }

    const axes = [bustVerdict];
    if (waistVerdict) axes.push(waistVerdict);
    if (hipVerdict) axes.push(hipVerdict);
    axes.push(lengthVerdict);

    return {
      size,
      bust: bustVerdict,
      waist: waistVerdict,
      hip: hipVerdict,
      length: lengthVerdict,
      recommendation: recommendFromAxes(axes),
      fitName: fitNameFromAxes(axes),
    };
  }

  // ============================================================
  // TOPS & BOTTOMS — two-axis (width + length)
  // ============================================================
  let userBody: number;
  let bodyChart: number | undefined;
  let garmentFlat: number | undefined;
  let widthLabel: string;

  if (product.category === "top") {
    userBody = profile.upperBody;
    bodyChart = product.gender === "female"
      ? (garment.bust ?? garment.chest)
      : (garment.chest ?? garment.bust);
    garmentFlat = product.gender === "female"
      ? (garmentFlatRow?.bust ?? garmentFlatRow?.chest)
      : (garmentFlatRow?.chest ?? garmentFlatRow?.bust);
    widthLabel = product.gender === "female" ? "Bust" : "Chest";
  } else {
    userBody = profile.waistInches;
    bodyChart = garment.waist;
    garmentFlat = garmentFlatRow?.waist;
    widthLabel = "Waist";
  }
  if (bodyChart === undefined && garmentFlat === undefined) return null;

  const widthVerdict = analyzeWidth({
    category: product.category,
    axisLabel: widthLabel,
    bodyChart, garmentFlat,
    userBody,
    garmentStyle: product.garmentStyle,
    title: product.title,
  });

  // For tops, also analyze waist and hip when the chart provides them.
  // The original v1 math only looked at bust+length for tops, which
  // misses real fit problems on kurtas and anarkalis — those charts
  // routinely ship waist (and sometimes hip) measurements, and the
  // brand often sizes by waist, not by bust. Without the waist axis,
  // a chart with To Fit Waist == garment Waist (zero designed ease at
  // waist, classic empire-waist anarkali pattern) would let the math
  // happily recommend XXL for a 30" waist user — that 10" of waist
  // slack is invisible. Adding waist+hip here surfaces it.
  // Bottoms aren't touched: their width axis IS waist.
  let waistVerdict: AxisVerdict | undefined;
  let hipVerdict: AxisVerdict | undefined;
  // Anarkalis are flared from the empire waist downward by design — the
  // waist seam fits at the natural waist but the skirt below is meant to
  // be many inches wider than the body waist/hip. Running the waist and
  // hip axes on an anarkali correctly identifies that the garment is
  // "looser than expected" but the verdict is misleading: that's the
  // intended silhouette, not a fit problem. Skip these axes for anarkalis
  // so the verdict only reflects bust + length, which is what the cut
  // actually constrains.
  if (product.category === "top" && product.garmentStyle !== "anarkali") {
    const bodyWaist = garment.waist;
    const garmentFlatWaist = garmentFlatRow?.waist;
    if (
      (bodyWaist !== undefined || garmentFlatWaist !== undefined) &&
      profile.waistInches !== undefined
    ) {
      waistVerdict = analyzeWidth({
        category: "top",
        axisLabel: "Waist",
        bodyChart: bodyWaist,
        garmentFlat: garmentFlatWaist,
        userBody: profile.waistInches,
        garmentStyle: product.garmentStyle,
        title: product.title,
      });
    }

    const bodyHip = garment.hip;
    const garmentFlatHip = garmentFlatRow?.hip;
    if (
      (bodyHip !== undefined || garmentFlatHip !== undefined) &&
      profile.hipInches !== undefined
    ) {
      hipVerdict = analyzeWidth({
        category: "top",
        axisLabel: "Hip",
        bodyChart: bodyHip,
        garmentFlat: garmentFlatHip,
        userBody: profile.hipInches,
        garmentStyle: product.garmentStyle,
        title: product.title,
      });
    }
  }

  const garmentLen = product.category === "top" ? garment.length : garment.inseam ?? garment.length;
  let lengthVerdict: AxisVerdict;
  if (garmentLen === undefined) {
    // No length data available from the page. Don't fabricate a verdict
    // by comparing expected-to-expected (which trivially passes and
    // false-positives a green tick). Emit a neutral status that the
    // recommendation aggregator ignores.
    lengthVerdict = {
      status: "unknown",
      diff: 0,
      headline: "Length info unavailable",
      detail: "This product doesn't list a length measurement. Verdict is based on width only.",
    };
  } else {
    const expected = expectedLength(product.garmentStyle, profile.gender, profile.heightInches);
    const lengthDiff = garmentLen - expected;
    lengthVerdict = analyzeLength(product.garmentStyle, lengthDiff);
  }

  const axes = [widthVerdict];
  if (waistVerdict) axes.push(waistVerdict);
  if (hipVerdict) axes.push(hipVerdict);
  axes.push(lengthVerdict);
  return {
    size,
    width: widthVerdict,
    waist: waistVerdict,
    hip: hipVerdict,
    length: lengthVerdict,
    recommendation: recommendFromAxes(axes),
    fitName: fitNameFromAxes(axes),
  };
}

function pickRecommended(sizes: SizeFit[]): string {
  const recOrder: Record<Recommendation, number> = {
    recommended: 0, may_work: 1, not_recommended: 2,
  };
  const sorted = [...sizes].sort((a, b) => {
    const r = recOrder[a.recommendation] - recOrder[b.recommendation];
    if (r !== 0) return r;
    // Tie-break by smallest absolute primary-axis diff
    const aDiff = Math.abs((a.width ?? a.bust)?.diff ?? 0);
    const bDiff = Math.abs((b.width ?? b.bust)?.diff ?? 0);
    return aDiff - bDiff;
  });
  return sorted[0]?.size ?? sizes[0].size;
}

export function computeFit(product: ParsedProduct, profile: Profile): FitVerdict | null {
  if (product.gender !== profile.gender) return null;
  const sizes = product.sizes
    .map((s) => fitForSize(product, profile, s))
    .filter((s): s is SizeFit => s !== null);
  if (sizes.length === 0) return null;

  return {
    product,
    recommendedSize: pickRecommended(sizes),
    sizes,
    computedAt: new Date().toISOString(),
  };
}

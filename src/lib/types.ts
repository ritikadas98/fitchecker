/**
 * Shared types used across content script, background, and side panel.
 */

export type Gender = "male" | "female";
export type Category = "top" | "bottom" | "dress";

/**
 * Garment style is finer-grained than category. Two tops with the same chart
 * length can produce opposite fit verdicts — a 28" t-shirt on a 5'2" body is
 * too long, but a 28" kurta on the same body is correct. The fit math uses
 * style to decide what length is "expected" before judging the verdict.
 *
 * Adapters set this from retailer-specific signals — Myntra exposes it
 * directly via articleAttributes.Length + articleType.
 */
export type GarmentStyle =
  // Tops
  | "crop_top"
  | "top_regular"
  | "tunic"
  | "kurta_short"
  | "kurta_long"
  | "anarkali"
  // Bottoms
  | "trousers"
  | "jeans"
  | "shorts"
  | "skirt"
  // Dresses (three-axis fit math required)
  | "dress_short"
  | "dress_long"
  // Fallbacks
  | "unknown_top"
  | "unknown_bottom"
  | "unknown_dress";

export interface ParsedProduct {
  id: string;
  site: string;
  brand: string;
  title: string;
  gender: Gender;
  category: Category;
  garmentStyle: GarmentStyle;
  sizes: string[];
  /**
   * Body chart measurements per size — "this size fits a body of X bust".
   * This is the canonical "what size should I buy" comparison axis.
   */
  measurements: Record<string, Partial<Record<Dimension, number>>>;
  /**
   * Garment flat measurements per size — "the actual physical circumference
   * of this size's bust/waist/etc". Optional. Currently populated only by
   * Myntra (which exposes both columns: "Bust" = garment flat,
   * "To Fit Bust" = body chart).
   *
   * When present, fit-math computes designed ease = garmentMeasurement −
   * bodyChart and uses it to calibrate verdict thresholds (an oversized
   * t-shirt with 8" of designed ease shouldn't be flagged "too tight" for
   * a body that's only 4" larger than the chart — the garment is still
   * physically loose, just less oversized than designer intent).
   */
  garmentMeasurements?: Record<string, Partial<Record<Dimension, number>>>;
  url: string;
}

export type Dimension = "bust" | "chest" | "waist" | "hip" | "length" | "inseam";

export interface Profile {
  /** Currently active gender — drives which product PDPs match. */
  gender: Gender;
  heightInches: number;
  /** Bust (female) or chest (male), inches. Mirrors byGender[gender].upperBody. */
  upperBody: number;
  waistInches: number;
  /** Hip measurement, inches. Optional — required only for dress fits. */
  hipInches?: number;
  /**
   * Per-gender remembered measurements. When the user toggles gender,
   * the previous gender's values are saved here and the new gender's
   * values are loaded from here (or left blank for re-entry if absent).
   * Top-level upperBody/waistInches/hipInches always reflect the
   * currently active gender, so fit-math reads them directly without
   * needing to know about byGender.
   */
  byGender?: {
    female?: BodyMeasurements;
    male?: BodyMeasurements;
  };
  updatedAt: string;
}

/** Per-gender body measurements. Height is gender-invariant so it's not here. */
export interface BodyMeasurements {
  upperBody: number;
  waistInches: number;
  hipInches?: number;
}

export type FitStatus = "perfect" | "good" | "okay" | "poor" | "unknown";
export type Recommendation = "recommended" | "may_work" | "not_recommended";

/**
 * Per-axis verdict.
 * For tops: {width, length}.
 * For bottoms: {width=waist, length=inseam}.
 * For dresses: {bust, waist, hip, length}.
 */
export interface AxisVerdict {
  status: FitStatus;
  /** Difference in inches: garment - expected. Negative = tighter / shorter. */
  diff: number;
  headline: string;
  detail: string;
}

export interface SizeFit {
  size: string;
  /** For tops/bottoms — the single width axis. Always present except for dresses. */
  width?: AxisVerdict;
  /** For tops/bottoms — length axis. Always present. */
  length: AxisVerdict;
  /** Dress-only: per-zone width axes. */
  bust?: AxisVerdict;
  waist?: AxisVerdict;
  hip?: AxisVerdict;
  recommendation: Recommendation;
  /** Short label for the verdict chip. */
  fitName: string;
}

export interface FitVerdict {
  product: ParsedProduct;
  recommendedSize: string;
  sizes: SizeFit[];
  computedAt: string;
}

export type ExtractionFailReason =
  | "no_pdp"
  | "no_size_chart_found"
  | "chart_was_image"
  | "selectors_failed"
  | "unsupported_units"
  | "no_sizes_listed"
  | "no_hip_profile"           // dress requires hip measurement; user hasn't entered it
  | "unknown_error";

export interface ExtractionResult {
  ok: boolean;
  product?: ParsedProduct;
  reason?: ExtractionFailReason;
  detail?: string;
}

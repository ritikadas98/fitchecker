import { useEffect, useMemo, useState } from "react";
import { send } from "../../lib/messages";
import { record } from "../../lib/analytics";
import { buildSilhouette } from "../../lib/silhouette";
import type {
  AxisVerdict,
  FitVerdict as FitVerdictType,
  Profile,
  Recommendation,
  SizeFit,
} from "../../lib/types";
import { TintedComposite } from "./TintedComposite";
import { FitIndicators } from "./FitIndicators";
import { CalibrateProfile } from "./CalibrateProfile";

type FitOutcome = "fit" | "too_tight" | "too_loose";

interface Props {
  verdict: FitVerdictType;
  profile: Profile;
}

const RECOMMENDATION_META: Record<Recommendation, { label: string; chipClass: string; icon: string }> = {
  recommended:     { label: "Recommended for you", chipClass: "rec-good", icon: "✓" },
  may_work:        { label: "May work for you",    chipClass: "rec-okay", icon: "!" },
  not_recommended: { label: "Not recommended",     chipClass: "rec-poor", icon: "×" },
};

// Display size of the silhouette area inside the side panel (CSS px).
// Aspect 2:3 matches the source asset (1024:1536) so the figure renders
// without distortion.
const SILHOUETTE_W = 220;
const SILHOUETTE_H = 330;

export function FitVerdict({ verdict, profile }: Props) {
  const [selectedSize, setSelectedSize] = useState<string>(verdict.recommendedSize);
  const [calibrating, setCalibrating] = useState(false);
  // Locally tracked so we can render the picked button as selected after the
  // user reports back. Each click also persists a fit_outcome event to the
  // local ring buffer via record(); the in-memory state is only for UI.
  const [outcomeFor, setOutcomeFor] = useState<{
    size: string;
    outcome: FitOutcome;
  } | null>(null);

  // When the active product changes (user navigated to a new PDP or
  // switched tabs), reset the selected size to the new recommendation,
  // close any open calibration panel, and clear any prior outcome
  // selection — all of those targeted the previous product.
  useEffect(() => {
    setSelectedSize(verdict.recommendedSize);
    setCalibrating(false);
    setOutcomeFor(null);
  }, [verdict.product.id, verdict.recommendedSize]);

  function handleOutcome(outcome: FitOutcome): void {
    setOutcomeFor({ size: selectedSize, outcome });
    void record({
      kind: "fit_outcome",
      site: verdict.product.site,
      size: selectedSize,
      outcome,
      recommendedSize: verdict.recommendedSize,
    });
  }

  const fit = verdict.sizes.find((s) => s.size === selectedSize) ?? verdict.sizes[0];
  const rec = RECOMMENDATION_META[fit.recommendation];

  const silhouette = useMemo(
    () => buildSilhouette({ gender: profile.gender, fit, garmentStyle: verdict.product.garmentStyle }),
    [profile.gender, fit, verdict.product.garmentStyle],
  );

  function handleSizePick(size: string) {
    if (size === selectedSize) return;
    setSelectedSize(size);
    if (size !== verdict.recommendedSize) {
      void send({
        type: "OVERRIDE",
        chosenSize: size,
        recommendedSize: verdict.recommendedSize,
      });
    }
  }

  // Build the analysis rows in display order.
  // Dresses: bust, waist, hip, length. Tops: width, length. Bottoms: width, length.
  const axes: Array<{ label: string; verdict: AxisVerdict }> = [];
  // Order: bust → waist → hip → length. For tops, fit.width carries the
  // bust verdict and waist/hip are populated when the chart provides them
  // (kurtas/anarkalis typically do). For dresses, bust/waist/hip are
  // populated directly and fit.width is absent. Bottoms only carry width
  // (waist) + length.
  if (fit.bust) axes.push({ label: "Bust", verdict: fit.bust });
  if (fit.width && verdict.product.category === "top") {
    const widthLabel = verdict.product.gender === "female" ? "Bust" : "Chest";
    axes.push({ label: widthLabel, verdict: fit.width });
  }
  if (fit.waist) axes.push({ label: "Waist", verdict: fit.waist });
  if (fit.hip) axes.push({ label: "Hip", verdict: fit.hip });
  if (fit.width && verdict.product.category === "bottom") {
    axes.push({ label: "Waist", verdict: fit.width });
  }
  axes.push({ label: "Length", verdict: fit.length });

  return (
    <div className="verdict">
      <p className="product-meta">{verdict.product.brand} · {capitalize(verdict.product.site)}</p>
      <p className="product-title">{verdict.product.title}</p>

      <div className="verdict-headline">
        <span className="verdict-size">{fit.size}</span>
        <span className="verdict-fitname">{fit.fitName}</span>
      </div>

      <div className={`recommendation ${rec.chipClass}`}>
        <span className="rec-icon" aria-hidden>{rec.icon}</span>
        <span className="rec-label">{rec.label}</span>
      </div>

      {verdict.product.purchasedSize && (
        <div
          className={`purchase-callout ${
            verdict.product.purchasedSize === verdict.recommendedSize
              ? "purchase-callout-match"
              : "purchase-callout-differ"
          }`}
        >
          <span className="purchase-callout-icon" aria-hidden>
            {verdict.product.purchasedSize === verdict.recommendedSize ? "✓" : "!"}
          </span>
          <span className="purchase-callout-text">
            {verdict.product.purchasedSize === verdict.recommendedSize ? (
              <>
                <strong>Matches your previous order.</strong> You bought size{" "}
                {verdict.product.purchasedSize}, and the math picks the same
                size for your current measurements.
              </>
            ) : (
              <>
                You previously bought size{" "}
                <strong>{verdict.product.purchasedSize}</strong>. The math now
                recommends <strong>{verdict.recommendedSize}</strong> based on
                your current measurements.
              </>
            )}
          </span>
        </div>
      )}

      {/* Silhouette: composite + tint + outline + pins */}
      <div
        className="silhouette-wrap"
        style={{ width: SILHOUETTE_W, height: SILHOUETTE_H }}
      >
        {silhouette.imageUrl && silhouette.meta ? (
          <>
            <TintedComposite
              imageUrl={silhouette.imageUrl}
              meta={silhouette.meta}
              tintColor={silhouette.tier.tint}
              outlineColor={silhouette.tier.outline}
              widthScale={silhouette.widthScale}
              width={SILHOUETTE_W}
              height={SILHOUETTE_H}
            />
            <FitIndicators
              pins={silhouette.pins}
              width={SILHOUETTE_W}
              height={SILHOUETTE_H}
            />
          </>
        ) : (
          <div className="silhouette-empty">No preview available</div>
        )}
      </div>

      {/* Per-axis analysis */}
      <div className="analysis">
        {axes.map((a) => (
          <div className="axis" key={a.label}>
            <div className="axis-headline">
              <span className={`status-dot status-${a.verdict.status}`} aria-hidden />
              <strong>{a.verdict.headline}</strong>
              <span className="axis-label">{a.label}</span>
            </div>
            <p className="axis-detail">{a.verdict.detail}</p>
          </div>
        ))}
      </div>

      <p className="section-label">Try a different size</p>
      <div className="size-row">
        {verdict.sizes.map((sf) => (
          <SizeButton
            key={sf.size}
            sizeFit={sf}
            selected={sf.size === selectedSize}
            isRecommended={sf.size === verdict.recommendedSize}
            onPick={handleSizePick}
          />
        ))}
      </div>

      {/* Fit-outcome feedback. Local-only: clicking writes a typed
          fit_outcome event to the analytics ring buffer. The override
          event already tells us "user disagreed at purchase time"; this
          tells us "did the verdict survive contact with reality?" — the
          accuracy signal a real-world fit tool needs. */}
      <div className="fit-outcome">
        <p className="fit-outcome-label">
          Did size <strong>{selectedSize}</strong> fit?
        </p>
        <div className="fit-outcome-row">
          {([
            ["fit", "Fit"],
            ["too_tight", "Too tight"],
            ["too_loose", "Too loose"],
          ] as Array<[FitOutcome, string]>).map(([value, label]) => {
            const isSelected =
              outcomeFor?.size === selectedSize && outcomeFor.outcome === value;
            return (
              <button
                key={value}
                type="button"
                className={`fit-outcome-btn${isSelected ? " selected" : ""}`}
                onClick={() => handleOutcome(value)}
              >
                {label}
              </button>
            );
          })}
        </div>
        {outcomeFor?.size === selectedSize && (
          <p className="fit-outcome-thanks">Saved locally — thanks.</p>
        )}
      </div>

      {/* Calibrate-from-known-good entry point. When the user has a product
          that they know fits, this seeds the profile from the retailer's
          published body chart for the size that fit, instead of asking
          for raw bust/waist/hip numbers most shoppers don't know. */}
      {calibrating ? (
        <CalibrateProfile
          product={verdict.product}
          initialSize={selectedSize}
          currentProfile={profile}
          onCancel={() => setCalibrating(false)}
          onSaved={() => setCalibrating(false)}
        />
      ) : (
        <button
          className="calibrate-cta"
          type="button"
          onClick={() => setCalibrating(true)}
        >
          This fits me — set up my profile from it
        </button>
      )}
    </div>
  );
}

function SizeButton({
  sizeFit,
  selected,
  isRecommended,
  onPick,
}: {
  sizeFit: SizeFit;
  selected: boolean;
  isRecommended: boolean;
  onPick: (size: string) => void;
}) {
  const cls = ["size-btn", `size-btn-${sizeFit.recommendation}`];
  if (selected) cls.push("selected");
  return (
    <button
      className={cls.join(" ")}
      onClick={() => onPick(sizeFit.size)}
      title={`${sizeFit.size}: ${sizeFit.fitName}`}
      type="button"
    >
      {sizeFit.size}
      {isRecommended && <span className="rec-marker" aria-label="Recommended">★</span>}
    </button>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

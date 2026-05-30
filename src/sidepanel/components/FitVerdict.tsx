import { useEffect, useMemo, useState } from "react";
import { send } from "../../lib/messages";
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

  // When the active product changes (user navigated to a new PDP or
  // switched tabs), reset the selected size to the new recommendation.
  // Doing this in an effect keeps render pure and avoids the
  // setState-during-render warning under StrictMode.
  useEffect(() => {
    setSelectedSize(verdict.recommendedSize);
  }, [verdict.product.id, verdict.recommendedSize]);

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
  if (fit.bust)  axes.push({ label: "Bust", verdict: fit.bust });
  if (fit.waist && verdict.product.category === "dress") axes.push({ label: "Waist", verdict: fit.waist });
  if (fit.hip)   axes.push({ label: "Hip", verdict: fit.hip });
  if (fit.width) {
    const widthLabel = verdict.product.category === "top"
      ? (verdict.product.gender === "female" ? "Bust" : "Chest")
      : "Waist";
    axes.push({ label: widthLabel, verdict: fit.width });
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

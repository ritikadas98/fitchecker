/**
 * CalibrateProfile — seed the user's profile from a product they know fits.
 *
 * Most shoppers don't know their bust/waist/hip in inches but DO know "size M
 * jeans from AJIO fits me well." This component flips that around: pick the
 * size that fit, read the BODY CHART values for that size out of the parsed
 * product, write them into the profile.
 *
 * Important: we read measurements[size] (the body chart — "this size targets
 * a 30-inch waist body"), NOT garmentMeasurements[size] (the actual garment
 * circumference). "It fits me" maps to the body the size was designed for,
 * and this deliberately trusts the chart over the misleading size label.
 *
 * MERGE semantics (not overwrite): a top fills upperBody only; a bottom fills
 * waist (and hip when present); a dress fills all three. Calibrating from
 * multiple items over time fills gaps rather than clobbering values the user
 * has from another item.
 *
 * Height never comes from a garment — it stays as a separate input prefilled
 * from the existing profile.
 *
 * Scope: only Myntra, AJIO, and H&M India PDPs can calibrate (we need the
 * retailer's published body chart). Items from other stores or physical-store
 * purchases aren't supported; the help copy says so.
 */
import { useEffect, useMemo, useState } from "react";
import { setProfile as saveProfile } from "../../lib/storage";
import { send } from "../../lib/messages";
import type {
  BodyMeasurements,
  Dimension,
  ParsedProduct,
  Profile,
} from "../../lib/types";

interface Props {
  product: ParsedProduct;
  /** Size pre-selected in the calibration form. Usually the size the user
   *  was looking at in the verdict view. */
  initialSize: string;
  currentProfile: Profile;
  onCancel: () => void;
  onSaved: () => void;
}

/**
 * Pull the dimensions we can map to a Profile out of measurements[size].
 * Returns null if the chart has nothing usable for that size — caller can
 * disable save in that case.
 */
function extractInferred(
  product: ParsedProduct,
  size: string,
): { upperBody?: number; waistInches?: number; hipInches?: number } | null {
  const row: Partial<Record<Dimension, number>> | undefined =
    product.measurements[size];
  if (!row) return null;
  const upperBody = row.bust ?? row.chest;
  const waistInches = row.waist;
  const hipInches = row.hip;
  if (
    upperBody === undefined &&
    waistInches === undefined &&
    hipInches === undefined
  ) {
    return null;
  }
  return { upperBody, waistInches, hipInches };
}

export function CalibrateProfile({
  product,
  initialSize,
  currentProfile,
  onCancel,
  onSaved,
}: Props) {
  const [size, setSize] = useState(initialSize);
  const inferred = useMemo(() => extractInferred(product, size), [product, size]);

  // Fields hold the proposed values the user can nudge before saving. They
  // initialize from the inferred body chart for the picked size; when the
  // user changes the size, the fields reset to the new inferred row.
  const [upperBody, setUpperBody] = useState(
    inferred?.upperBody !== undefined ? String(inferred.upperBody) : "",
  );
  const [waist, setWaist] = useState(
    inferred?.waistInches !== undefined ? String(inferred.waistInches) : "",
  );
  const [hip, setHip] = useState(
    inferred?.hipInches !== undefined ? String(inferred.hipInches) : "",
  );

  const initialFt = Math.floor(currentProfile.heightInches / 12);
  const initialIn = currentProfile.heightInches % 12;
  const [heightFt, setHeightFt] = useState(String(initialFt));
  const [heightIn, setHeightIn] = useState(String(initialIn));

  const [saving, setSaving] = useState(false);

  // When size selection changes, reset the proposed fields to the new
  // inferred row. User can still nudge afterward.
  useEffect(() => {
    if (!inferred) return;
    if (inferred.upperBody !== undefined) setUpperBody(String(inferred.upperBody));
    if (inferred.waistInches !== undefined) setWaist(String(inferred.waistInches));
    if (inferred.hipInches !== undefined) setHip(String(inferred.hipInches));
  }, [size, inferred]);

  const upperBodyLabel = currentProfile.gender === "female" ? "Bust" : "Chest";

  async function handleSave() {
    if (!inferred) return;
    setSaving(true);

    // Merge: start with the existing profile, overlay only the fields the
    // product gave us. Nothing else gets clobbered.
    const next: Profile = {
      ...currentProfile,
      heightInches:
        (parseInt(heightFt, 10) || 0) * 12 + (parseInt(heightIn, 10) || 0),
      updatedAt: new Date().toISOString(),
    };

    if (inferred.upperBody !== undefined) {
      const v = parseFloat(upperBody);
      if (!isNaN(v)) next.upperBody = v;
    }
    if (inferred.waistInches !== undefined) {
      const v = parseFloat(waist);
      if (!isNaN(v)) next.waistInches = v;
    }
    if (inferred.hipInches !== undefined) {
      const v = parseFloat(hip);
      if (!isNaN(v)) next.hipInches = v;
    }

    // Mirror the updated values into byGender for the active gender so the
    // gender-switch flow stays consistent. Anything we didn't touch (e.g.
    // the other gender's slot) is preserved.
    const measurements: BodyMeasurements = {
      upperBody: next.upperBody,
      waistInches: next.waistInches,
      hipInches: next.hipInches,
    };
    next.byGender = {
      ...(currentProfile.byGender ?? {}),
      [currentProfile.gender]: measurements,
    };

    await saveProfile(next);
    // Background re-runs fit math for every cached tab and pushes the
    // active tab's new verdict. In the demo this is a no-op (shimmed
    // sendMessage) but the storage change still fires onProfileChange,
    // so DemoApp picks it up automatically.
    await send({ type: "PROFILE_SAVED", profile: next });
    setSaving(false);
    onSaved();
  }

  const noData = inferred === null;
  const canSave = !noData && !saving;

  return (
    <div className="calibrate-form">
      <h3 className="calibrate-title">Set my profile from this item</h3>
      <p className="calibrate-help">
        Pick the size that fit. We'll read the retailer's body chart for that
        size and fill your profile. You can nudge each number before saving.
      </p>
      <p className="calibrate-scope">
        Works on Myntra, AJIO, and H&amp;M India PDPs. Items from other stores
        or physical-store purchases can't calibrate.
      </p>

      <div className="field">
        <label className="field-label">Size that fit you</label>
        <select
          className="calibrate-select"
          value={size}
          onChange={(e) => setSize(e.target.value)}
        >
          {product.sizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {noData && (
        <p className="calibrate-empty">
          This product's chart doesn't include bust/waist/hip values for size{" "}
          {size}. Pick a different size or skip calibrating from this item.
        </p>
      )}

      {!noData && inferred?.upperBody !== undefined && (
        <div className="field">
          <label className="field-label">{upperBodyLabel} (in)</label>
          <input
            inputMode="decimal"
            value={upperBody}
            onChange={(e) => setUpperBody(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </div>
      )}
      {!noData && inferred?.waistInches !== undefined && (
        <div className="field">
          <label className="field-label">Waist (in)</label>
          <input
            inputMode="decimal"
            value={waist}
            onChange={(e) => setWaist(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </div>
      )}
      {!noData && inferred?.hipInches !== undefined && (
        <div className="field">
          <label className="field-label">Hip (in)</label>
          <input
            inputMode="decimal"
            value={hip}
            onChange={(e) => setHip(e.target.value.replace(/[^\d.]/g, ""))}
          />
        </div>
      )}

      <div className="field">
        <label className="field-label">
          Height <span className="field-hint">— can't come from a garment chart</span>
        </label>
        <div className="row">
          <input
            inputMode="numeric"
            value={heightFt}
            onChange={(e) => setHeightFt(e.target.value.replace(/\D/g, ""))}
            placeholder="ft"
            aria-label="Height in feet"
          />
          <input
            inputMode="numeric"
            value={heightIn}
            onChange={(e) => setHeightIn(e.target.value.replace(/\D/g, ""))}
            placeholder="in"
            aria-label="Height in inches"
          />
        </div>
      </div>

      <div className="actions">
        <button className="ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="primary"
          type="button"
          onClick={handleSave}
          disabled={!canSave}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { setProfile } from "../../lib/storage";
import { send } from "../../lib/messages";
import type { BodyMeasurements, Gender, Profile } from "../../lib/types";

interface Props {
  existing?: Profile;
  onSaved: () => void;
  onCancel?: () => void;
  /** When set, lock the gender toggle and start the form on this gender. */
  forcedGender?: Gender;
}

/**
 * Snapshot the current form values into a BodyMeasurements record. Returns
 * null if any required field is empty / unparseable, which we use to skip
 * persisting a partial entry.
 */
function snapshotForm(
  upperBody: string,
  waist: string,
  hip: string,
): BodyMeasurements | null {
  const ub = parseFloat(upperBody);
  const w = parseFloat(waist);
  if (isNaN(ub) || isNaN(w)) return null;
  return {
    upperBody: ub,
    waistInches: w,
    hipInches: hip !== "" && !isNaN(parseFloat(hip)) ? parseFloat(hip) : undefined,
  };
}

export function ProfileSetup({ existing, onSaved, onCancel, forcedGender }: Props) {
  const initialGender: Gender = forcedGender ?? existing?.gender ?? "female";
  const [gender, setGender] = useState<Gender>(initialGender);

  // Height is gender-invariant; keep it shared.
  const [heightFt, setHeightFt] = useState(
    existing ? String(Math.floor(existing.heightInches / 12)) : "5",
  );
  const [heightIn, setHeightIn] = useState(
    existing ? String(existing.heightInches % 12) : "4",
  );

  // Body fields. Initial values come from the active gender's saved
  // measurements if present, falling back to top-level Profile fields
  // (legacy) and finally empty.
  const initialFor = (g: Gender): BodyMeasurements | undefined => {
    const stored = existing?.byGender?.[g];
    if (stored) return stored;
    // Legacy: existing.upperBody/etc are for existing.gender. Use them
    // only when matching the form's gender, so toggling to the OTHER
    // gender on a legacy profile starts the fields blank.
    if (existing && existing.gender === g) {
      return {
        upperBody: existing.upperBody,
        waistInches: existing.waistInches,
        hipInches: existing.hipInches,
      };
    }
    return undefined;
  };

  const [upperBody, setUpperBody] = useState(
    initialFor(initialGender) ? String(initialFor(initialGender)!.upperBody) : "",
  );
  const [waist, setWaist] = useState(
    initialFor(initialGender) ? String(initialFor(initialGender)!.waistInches) : "",
  );
  const [hip, setHip] = useState(
    initialFor(initialGender)?.hipInches !== undefined
      ? String(initialFor(initialGender)!.hipInches)
      : "",
  );

  const [saving, setSaving] = useState(false);

  // Per-gender drafts so toggling gender mid-edit doesn't lose the values
  // typed for the other gender. Seeded from existing.byGender (or legacy).
  const [drafts, setDrafts] = useState<Partial<Record<Gender, BodyMeasurements>>>(() => {
    const result: Partial<Record<Gender, BodyMeasurements>> = {};
    const f = initialFor("female");
    const m = initialFor("male");
    if (f) result.female = f;
    if (m) result.male = m;
    return result;
  });

  function switchGender(next: Gender) {
    if (next === gender) return;
    if (forcedGender) return; // gender locked by caller
    // Snapshot current form values into the OUTGOING gender's draft slot
    // so they're preserved if the user switches back.
    const snap = snapshotForm(upperBody, waist, hip);
    setDrafts((d) => ({
      ...d,
      ...(snap ? { [gender]: snap } : {}),
    }));
    // Load the INCOMING gender's saved values into the form fields.
    const incoming = drafts[next] ?? initialFor(next);
    setUpperBody(incoming ? String(incoming.upperBody) : "");
    setWaist(incoming ? String(incoming.waistInches) : "");
    setHip(incoming?.hipInches !== undefined ? String(incoming.hipInches) : "");
    setGender(next);
  }

  const valid = upperBody !== "" && waist !== "" && heightFt !== "";

  async function save() {
    if (!valid) return;
    setSaving(true);

    const currentSnap = snapshotForm(upperBody, waist, hip);
    if (!currentSnap) {
      setSaving(false);
      return;
    }

    // Merge the current gender's snapshot into the byGender record,
    // preserving whatever's saved for the other gender.
    const byGender: { female?: BodyMeasurements; male?: BodyMeasurements } = {
      ...drafts,
      [gender]: currentSnap,
    };
    // Also fold in existing.byGender (anything we didn't touch).
    if (existing?.byGender) {
      for (const g of ["female", "male"] as Gender[]) {
        if (!byGender[g] && existing.byGender[g]) byGender[g] = existing.byGender[g];
      }
    }

    const profile: Profile = {
      gender,
      heightInches: parseInt(heightFt) * 12 + parseInt(heightIn || "0"),
      upperBody: currentSnap.upperBody,
      waistInches: currentSnap.waistInches,
      hipInches: currentSnap.hipInches,
      byGender,
      updatedAt: new Date().toISOString(),
    };
    await setProfile(profile);
    await send({ type: "PROFILE_SAVED", profile });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="profile-setup">
      <h1 className="title">
        {existing ? "Edit your fit profile" : "Set up your fit profile"}
      </h1>
      <p className="subtitle">
        One-time setup. We&rsquo;ll use this on every supported store.
      </p>

      <div className="field">
        <label className="field-label">Gender</label>
        <div className="segmented">
          <button
            className={gender === "female" ? "seg active" : "seg"}
            onClick={() => switchGender("female")}
            type="button"
            disabled={Boolean(forcedGender)}
          >
            Female
          </button>
          <button
            className={gender === "male" ? "seg active" : "seg"}
            onClick={() => switchGender("male")}
            type="button"
            disabled={Boolean(forcedGender)}
          >
            Male
          </button>
        </div>
        {!forcedGender && (
          <p className="field-hint" style={{ marginTop: 4 }}>
            Measurements are remembered separately per gender.
          </p>
        )}
      </div>

      <div className="field">
        <label className="field-label">Height</label>
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

      <div className="field">
        <label className="field-label">
          {gender === "female" ? "Bust (in)" : "Chest (in)"}
        </label>
        <input
          inputMode="decimal"
          value={upperBody}
          onChange={(e) => setUpperBody(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="e.g. 36"
        />
      </div>

      <div className="field">
        <label className="field-label">Waist (in)</label>
        <input
          inputMode="decimal"
          value={waist}
          onChange={(e) => setWaist(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="e.g. 28"
        />
      </div>

      <div className="field">
        <label className="field-label">
          Hip (in) <span className="field-hint">— used for dress fit, optional</span>
        </label>
        <input
          inputMode="decimal"
          value={hip}
          onChange={(e) => setHip(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="e.g. 38"
        />
      </div>

      <div className="actions">
        {onCancel && (
          <button className="ghost" onClick={onCancel} type="button">
            Cancel
          </button>
        )}
        <button
          className="primary"
          onClick={save}
          disabled={!valid || saving}
          type="button"
        >
          {saving ? "Saving…" : existing ? "Save changes" : "Save profile"}
        </button>
      </div>
    </div>
  );
}

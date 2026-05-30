import { useEffect, useState } from "react";
import { ProfileSetup } from "./components/ProfileSetup";
import { FitVerdict } from "./components/FitVerdict";
import { Fallback } from "./components/Fallback";
import { getProfile, onProfileChange, setProfile as saveProfile } from "../lib/storage";
import { send } from "../lib/messages";
import type {
  ExtractionResult,
  FitVerdict as FitVerdictType,
  Gender,
  ParsedProduct,
  Profile,
} from "../lib/types";

interface VerdictResponse {
  product?: ParsedProduct;
  verdict?: FitVerdictType | null;
  failure?: ExtractionResult;
}

export function App() {
  const [profile, setProfileState] = useState<Profile | null | undefined>(undefined);
  const [product, setProduct] = useState<ParsedProduct | undefined>();
  const [verdict, setVerdict] = useState<FitVerdictType | null>(null);
  const [failure, setFailure] = useState<ExtractionResult | undefined>();
  const [editingProfile, setEditingProfile] = useState(false);

  // Load profile on mount and subscribe to changes.
  useEffect(() => {
    getProfile().then(setProfileState);
    return onProfileChange(setProfileState);
  }, []);

  // Pull current verdict + product for the active tab. Bound function so
  // we can call it from multiple useEffects (mount, tab change, page load).
  const refetchTabState = () => {
    send({ type: "REQUEST_VERDICT" }).then((r) => {
      const response = r as VerdictResponse | undefined;
      setProduct(response?.product);
      setVerdict(response?.verdict ?? null);
      setFailure(response?.failure);
    });
  };

  // On mount.
  useEffect(() => {
    refetchTabState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to verdict pushes from background (push path).
  useEffect(() => {
    const listener = (msg: unknown) => {
      if (typeof msg !== "object" || msg === null || !("type" in msg)) return;
      if ((msg as { type: string }).type !== "VERDICT") return;
      const m = msg as VerdictResponse;
      setProduct(m.product);
      setVerdict(m.verdict ?? null);
      setFailure(m.failure);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Safety-net: re-fetch on tab activation and on page load complete.
  // The push path can drop messages during page reloads (Chrome flakes
  // on cross-context messaging mid-navigation); this catches those cases.
  useEffect(() => {
    const onActivated = () => refetchTabState();
    const onUpdated = (
      tabId: number,
      info: chrome.tabs.TabChangeInfo,
    ) => {
      if (info.status !== "complete") return;
      chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => {
        if (t?.id === tabId) refetchTabState();
      });
    };
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Render ----------------------------------------------------------

  if (profile === undefined) {
    return <div className="panel"><Header /><div className="loading">Loading…</div></div>;
  }

  if (profile === null || editingProfile) {
    return (
      <div className="panel">
        <Header onSettings={null} />
        <ProfileSetup
          existing={profile ?? undefined}
          onCancel={editingProfile ? () => setEditingProfile(false) : undefined}
          onSaved={() => setEditingProfile(false)}
        />
      </div>
    );
  }

  // We have a profile. Detect gender mismatch BEFORE checking verdict —
  // a mismatched product yields verdict=null but we want to show a useful
  // banner instead of falling through to the generic fallback.
  const isMismatch =
    product !== undefined && product.gender !== profile.gender;

  if (isMismatch && product) {
    return (
      <div className="panel">
        <Header onSettings={() => setEditingProfile(true)} />
        <GenderMismatchBanner
          productGender={product.gender}
          currentGender={profile.gender}
          productTitle={product.title}
          onSwitch={async () => {
            const next = product.gender;
            // Pull the saved measurements for the target gender, if any.
            const target = profile.byGender?.[next];
            if (!target) {
              // No saved measurements for this gender — open the editor
              // pre-locked to the new gender so the user fills them in.
              setEditingProfile(true);
              return;
            }
            const updated: Profile = {
              ...profile,
              gender: next,
              upperBody: target.upperBody,
              waistInches: target.waistInches,
              hipInches: target.hipInches,
              updatedAt: new Date().toISOString(),
            };
            await saveProfile(updated);
            await send({ type: "PROFILE_SAVED", profile: updated });
            // The background's PROFILE_SAVED handler re-runs fit-math for
            // every cached tab and pushes the active tab's new state, so
            // we don't need to refetch here — the listener will fire.
          }}
          onEditProfile={() => setEditingProfile(true)}
        />
      </div>
    );
  }

  if (verdict) {
    return (
      <div className="panel">
        <Header onSettings={() => setEditingProfile(true)} />
        <FitVerdict verdict={verdict} profile={profile} />
      </div>
    );
  }

  return (
    <div className="panel">
      <Header onSettings={() => setEditingProfile(true)} />
      <Fallback failure={failure} product={product} />
    </div>
  );
}

function Header({ onSettings }: { onSettings?: (() => void) | null }) {
  return (
    <header className="panel-header">
      <span className="brand">FitCheck</span>
      {onSettings !== null && (
        <button
          className="icon-button"
          aria-label="Edit profile"
          onClick={onSettings}
        >
          ⚙
        </button>
      )}
    </header>
  );
}

interface MismatchProps {
  productGender: Gender;
  currentGender: Gender;
  productTitle: string;
  onSwitch: () => void;
  onEditProfile: () => void;
}

function GenderMismatchBanner({
  productGender,
  productTitle,
  onSwitch,
  onEditProfile,
}: MismatchProps) {
  const productLabel = productGender === "female" ? "women's" : "men's";
  const switchLabel = productGender === "female" ? "Female" : "Male";
  return (
    <div className="mismatch-banner">
      <h2 className="mismatch-title">This is a {productLabel} product</h2>
      <p className="mismatch-body">
        {productTitle ? <>“{productTitle}” </> : null}
        is a {productLabel} product, but your profile is set to{" "}
        {productGender === "female" ? "men's" : "women's"} fit. Switch to see
        sizing for this item.
      </p>
      <div className="mismatch-actions">
        <button className="primary" type="button" onClick={onSwitch}>
          Switch to {switchLabel}
        </button>
        <button className="ghost" type="button" onClick={onEditProfile}>
          Edit profile
        </button>
      </div>
      <p className="mismatch-hint">
        Your {productGender === "female" ? "men's" : "women's"} measurements stay
        saved — switching back later restores them.
      </p>
    </div>
  );
}

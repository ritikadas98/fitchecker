/**
 * DemoApp — root of the interactive demo.
 *
 * Pattern: instead of running App.tsx (which depends on chrome.runtime
 * messaging), we orchestrate locally. State held here:
 *   - activeTab: which fixture is selected
 *   - profile: read from chrome.storage shim, kept reactive via onProfileChange
 *   - editingProfile: whether ProfileSetup is open
 *
 * Verdict comes from running the real computeFit() on the active fixture's
 * product + the user's saved profile. No mock data on the math path.
 */
import { useEffect, useMemo, useState } from "react";
import { ChromeWindow } from "./ChromeWindow";
import { FIXTURES, type FixtureKey } from "./fixtures";

import { computeFit } from "../../src/lib/fit-math";
import { getProfile, onProfileChange } from "../../src/lib/storage";
import type { Profile } from "../../src/lib/types";

import { FitVerdict } from "../../src/sidepanel/components/FitVerdict";
import { ProfileSetup } from "../../src/sidepanel/components/ProfileSetup";

export function DemoApp() {
  const [activeTab, setActiveTab] = useState<FixtureKey>("myntra-flying-machine-tshirt");
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [editingProfile, setEditingProfile] = useState(false);

  // Load profile + subscribe to changes — same pattern as App.tsx.
  useEffect(() => {
    getProfile().then(setProfile);
    return onProfileChange(setProfile);
  }, []);

  const fixture = FIXTURES[activeTab];

  const verdict = useMemo(() => {
    if (!profile) return null;
    return computeFit(fixture.product, profile);
  }, [fixture.product, profile]);

  const isMismatch = Boolean(profile && fixture.product.gender !== profile.gender);

  return (
    <div className="demo-shell">
      <header className="demo-intro">
        <h1>FitCheck Interactive Demo</h1>
        <p>
          Enter your measurements once. Click the tabs to compare fit across
          nine products on Myntra, AJIO, and H&amp;M India — mens and womens, tops,
          bottoms, dresses, and ethnic wear. The side panel runs the real fit math
          against each product's actual size chart.
        </p>
      </header>

      <ChromeWindow activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="panel">
          <header className="panel-header">
            <span className="brand">FitCheck</span>
            {profile && !editingProfile && (
              <button
                className="icon-button"
                aria-label="Edit profile"
                onClick={() => setEditingProfile(true)}
                type="button"
              >
                ⚙
              </button>
            )}
          </header>

          {profile === undefined && (
            <div className="loading">Loading…</div>
          )}

          {profile !== undefined && (profile === null || editingProfile) && (
            <ProfileSetup
              existing={profile ?? undefined}
              onCancel={editingProfile ? () => setEditingProfile(false) : undefined}
              onSaved={() => setEditingProfile(false)}
            />
          )}

          {profile && !editingProfile && isMismatch && (
            <MismatchBanner
              productGender={fixture.product.gender}
              productTitle={fixture.product.title}
              onEditProfile={() => setEditingProfile(true)}
            />
          )}

          {profile && !editingProfile && !isMismatch && verdict && (
            <FitVerdict verdict={verdict} profile={profile} />
          )}

          {profile && !editingProfile && !isMismatch && !verdict && (
            <div className="loading">No verdict available for this product.</div>
          )}
        </div>
      </ChromeWindow>

      <footer className="demo-footer">
        <p>
          This is a runnable demo. The real extension is on{" "}
          <a href="https://github.com/ritikadas98/fitchecker" target="_blank" rel="noreferrer">
            GitHub
          </a>{" "}
          — install it on Chrome to use it on actual Myntra, AJIO, and H&amp;M India product
          pages.
        </p>
      </footer>
    </div>
  );
}

function MismatchBanner({
  productGender,
  productTitle,
  onEditProfile,
}: {
  productGender: "male" | "female";
  productTitle: string;
  onEditProfile: () => void;
}) {
  const productLabel = productGender === "female" ? "women's" : "men's";
  const oppositeLabel = productGender === "female" ? "men's" : "women's";
  return (
    <div className="mismatch-banner">
      <h2 className="mismatch-title">This is a {productLabel} product</h2>
      <p className="mismatch-body">
        “{productTitle}” is a {productLabel} product, but your profile is set to {oppositeLabel}{" "}
        fit. Switch gender in your profile to see sizing for this item.
      </p>
      <div className="mismatch-actions">
        <button className="primary" type="button" onClick={onEditProfile}>
          Edit profile
        </button>
      </div>
    </div>
  );
}

/**
 * Golden-set expectations for the verdict regression suite.
 *
 * For each demo fixture, ≥1 body profile is paired with the verdict the
 * real computeFit() is expected to produce. The suite (run.test.ts) feeds
 * the fixture's ParsedProduct + this profile into computeFit and asserts
 * the locked-in recommendedSize + recommendation tier match.
 *
 * The expected values are not hand-derived theoretical answers — they are
 * what the current math actually produces. Flipping any expected value
 * here should make the suite fail loudly, which is exactly the protection
 * we want against silent adapter or fit-math regressions.
 *
 * Two entries explicitly lock in behaviour the README calls out:
 *   - The AJIO Levi's 28-waist profile: math has to recommend size 28
 *     because the body-chart waist for size "28" is actually 30 (label vs
 *     real). This is the real-world AJIO exchange story in the README.
 *   - The Flying Machine drop-shoulder tee on a 36-inch male chest: the
 *     ease-aware path must NOT flag it as "too tight" even though the
 *     chart targets a smaller body — the garment is roomier than the
 *     body, which the math should detect.
 */
import type { Profile, Recommendation } from "../src/lib/types";
import type { FixtureKey } from "../demo/src/fixtures";

export interface ExpectedVerdict {
  /** Which fixture from demo/src/fixtures/ to feed in. */
  fixtureKey: FixtureKey;
  /** Short description used in the test name so failures point at the case. */
  profileLabel: string;
  /** Body profile to evaluate computeFit() against. */
  profile: Profile;
  expected: {
    recommendedSize: string;
    recommendation: Recommendation;
  };
}

/** Canonical body profiles. Reused across cases for consistency. */
const PROFILES: Record<string, Profile> = {
  // 5'4" woman with proportional measurements that hit the middle of most
  // size charts. Use this as the default unless a specific story needs a
  // different body.
  femaleMid: {
    gender: "female",
    heightInches: 64,
    upperBody: 36,
    waistInches: 28,
    hipInches: 38,
    updatedAt: "2026-01-01T00:00:00Z",
  },
  femaleSmaller: {
    gender: "female",
    heightInches: 64,
    upperBody: 34,
    waistInches: 28,
    hipInches: 38,
    updatedAt: "2026-01-01T00:00:00Z",
  },
  // 5'10" man, mid-size.
  maleMid: {
    gender: "male",
    heightInches: 70,
    upperBody: 40,
    waistInches: 32,
    hipInches: 38,
    updatedAt: "2026-01-01T00:00:00Z",
  },
  // 5'10" man with chest 38 — used for the Flying Machine ease-aware case.
  maleSlim: {
    gender: "male",
    heightInches: 70,
    upperBody: 38,
    waistInches: 32,
    hipInches: 38,
    updatedAt: "2026-01-01T00:00:00Z",
  },
  // 5'10" man with chest 36 — the README's "small body, oversized tee"
  // case. Locks in that the math does not call this "too tight".
  maleNarrowChest: {
    gender: "male",
    heightInches: 70,
    upperBody: 36,
    waistInches: 30,
    hipInches: 36,
    updatedAt: "2026-01-01T00:00:00Z",
  },
  // 5'10" man with waist 30 — the README's AJIO Levi's case. Body-chart
  // waist for size 28 on the Levi's cut IS 30, so this should recommend
  // size "28".
  maleSize28Waist: {
    gender: "male",
    heightInches: 70,
    upperBody: 38,
    waistInches: 30,
    hipInches: 36,
    updatedAt: "2026-01-01T00:00:00Z",
  },
};

export const EXPECTATIONS: ExpectedVerdict[] = [
  // === Myntra ===========================================================
  {
    fixtureKey: "myntra-flying-machine-tshirt",
    profileLabel: "male 36\" chest — ease-aware case (README)",
    profile: PROFILES.maleNarrowChest,
    expected: { recommendedSize: "S", recommendation: "recommended" },
  },
  {
    fixtureKey: "myntra-snitch-trousers",
    profileLabel: "male 32\" waist",
    profile: PROFILES.maleMid,
    expected: { recommendedSize: "32", recommendation: "may_work" },
  },
  {
    fixtureKey: "myntra-inddus-maxi",
    profileLabel: "female 36/28/38 — dress 4-axis path",
    profile: PROFILES.femaleMid,
    expected: { recommendedSize: "S", recommendation: "recommended" },
  },

  // === AJIO ============================================================
  {
    fixtureKey: "ajio-rangmanch-kurta",
    profileLabel: "female 36/28 — kurta_short with body-chart only",
    profile: PROFILES.femaleMid,
    expected: { recommendedSize: "M", recommendation: "recommended" },
  },
  {
    fixtureKey: "ajio-ritu-kumar-anarkali",
    profileLabel: "female 36/28/38 — anarkali skips waist/hip axes",
    profile: PROFILES.femaleMid,
    expected: { recommendedSize: "M", recommendation: "recommended" },
  },
  {
    fixtureKey: "ajio-indus-route-kurta",
    profileLabel: "male 40/32 — kurta_short, length runs short",
    profile: PROFILES.maleMid,
    expected: { recommendedSize: "M", recommendation: "may_work" },
  },
  {
    fixtureKey: "ajio-levis-jeans",
    profileLabel: "male 30\" waist — size 28 body (README real-world case)",
    profile: PROFILES.maleSize28Waist,
    expected: { recommendedSize: "28", recommendation: "recommended" },
  },
  {
    fixtureKey: "ajio-levis-jeans",
    profileLabel: "male 32\" waist — natural size 30",
    profile: PROFILES.maleMid,
    expected: { recommendedSize: "30", recommendation: "recommended" },
  },

  // === H&M =============================================================
  {
    fixtureKey: "hm-blouse",
    profileLabel: "female 34/28/38 — short blouse, length flagged",
    profile: PROFILES.femaleSmaller,
    expected: { recommendedSize: "S", recommendation: "may_work" },
  },
  {
    fixtureKey: "hm-jeans",
    profileLabel: "female 28\" waist 38\" hip — UK size 10",
    profile: PROFILES.femaleMid,
    expected: { recommendedSize: "10", recommendation: "recommended" },
  },
  {
    fixtureKey: "hm-sweatpants",
    profileLabel: "male 32\" waist — runs short for sweatpants",
    profile: PROFILES.maleMid,
    expected: { recommendedSize: "M", recommendation: "may_work" },
  },
];

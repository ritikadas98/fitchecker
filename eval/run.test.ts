/**
 * Verdict regression suite.
 *
 * Imports the REAL computeFit from src/lib/fit-math.ts and runs it against
 * the demo's 10 fixtures with the golden-set body profiles + expected
 * outcomes declared in expectations.ts. Does not reimplement any fit
 * logic; this file's only job is to assert that today's math output
 * matches yesterday's locked-in answer.
 *
 * Run with: npm run eval
 */
import { describe, expect, it } from "vitest";
import { computeFit } from "../src/lib/fit-math";
import { FIXTURES } from "../demo/src/fixtures";
import { EXPECTATIONS } from "./expectations";

describe("fit-math · golden-set regression", () => {
  for (const ex of EXPECTATIONS) {
    const fixture = FIXTURES[ex.fixtureKey];
    it(`${ex.fixtureKey} · ${ex.profileLabel}`, () => {
      const verdict = computeFit(fixture.product, ex.profile);

      expect(
        verdict,
        `computeFit returned null for ${ex.fixtureKey} — the fixture's measurements may have lost a key axis the math requires`,
      ).not.toBeNull();
      if (!verdict) return;

      expect(verdict.recommendedSize, "recommendedSize").toBe(
        ex.expected.recommendedSize,
      );

      const sizeFit = verdict.sizes.find(
        (s) => s.size === ex.expected.recommendedSize,
      );
      expect(
        sizeFit,
        `recommended size "${ex.expected.recommendedSize}" not found in verdict.sizes`,
      ).toBeDefined();
      expect(sizeFit?.recommendation, "recommendation tier").toBe(
        ex.expected.recommendation,
      );
    });
  }

  it("every fixture has at least one expectation", () => {
    const covered = new Set(EXPECTATIONS.map((e) => e.fixtureKey));
    const all = Object.keys(FIXTURES) as Array<keyof typeof FIXTURES>;
    const missing = all.filter((k) => !covered.has(k));
    expect(
      missing,
      `fixtures without any expectation: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});

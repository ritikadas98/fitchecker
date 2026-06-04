/**
 * Vitest config for the verdict eval harness.
 *
 * Only picks up tests under eval/. The test entry imports the REAL
 * computeFit from src/lib/fit-math.ts and runs it against the demo's
 * 10 fixtures; this config is intentionally minimal so the harness
 * stays a pure regression check, not a parallel test universe.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["eval/**/*.test.ts"],
    globals: false,
  },
});

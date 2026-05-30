/**
 * Vite config for the standalone interactive demo.
 *
 * Differences from the main extension build (vite.config.ts):
 *   - No @crxjs plugin; this builds a plain SPA, not a Chrome extension.
 *   - root = "demo" so demo/index.html is the entry.
 *   - publicDir points at the main /public folder so garment PNGs and icons
 *     are served at /garments/... and /icons/... — matching what the
 *     chrome.runtime.getURL shim returns.
 *   - base = "./" so the built output works under any GitHub Pages subpath
 *     (e.g. ritikadas98.github.io/fitchecker/) without further config.
 *   - server.fs.allow lets Vite import from outside the demo root (we
 *     reach into ../src/* for the real lib + components).
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: "demo",
  base: "./",
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "demo-dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    strictPort: true,
    fs: {
      // Allow Vite to serve files from the project root (../src, ../public).
      allow: [path.resolve(__dirname, ".")],
    },
  },
});

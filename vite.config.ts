import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";

const buildTime = new Date().toISOString();

/**
 * Emit `version.json` ({ version: <build timestamp> }) into dist/ so the
 * running app can detect a newer deployment with a no-store fetch — even
 * when the service worker itself is stale. Deliberately not matched by the
 * precache glob below, so it is never served from the SW cache.
 */
function versionFile(): Plugin {
  return {
    name: "version-file",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: buildTime }),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    tailwindcss(),
    versionFile(),
    VitePWA({
      // "prompt" (not "autoUpdate"): a new worker waits until the in-app
      // UpdatePrompt applies it, so the user is never silently kept on —
      // or yanked off — a running version. No skipWaiting here by design.
      registerType: "prompt",
      includeAssets: ["learny.svg", "sql-wasm.wasm"],
      manifest: {
        name: "Lexi!",
        short_name: "Lexi",
        description: "Turn vocabulary lists into interactive study sessions.",
        theme_color: "#161c2d",
        background_color: "#f7f0e0",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "learny.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        // sql-wasm.wasm is fetched asynchronously by sql.js at runtime; keep the
        // wasm out of the precache to avoid duplicate-fetch warnings.
        globPatterns: ["**/*.{js,css,html,svg,png}"],
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 1420,
  },
});
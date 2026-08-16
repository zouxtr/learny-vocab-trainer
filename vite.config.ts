import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";
import { getLanguage } from "./src/lib/languages";

// Local stand-in for the Vercel /api/generate-words function so the AI
// generation flow can be exercised in dev and in Playwright without an
// OpenRouter key. Never bundled into the production build. The mock echoes
// the requested languages so a wrong-language bug isn't masked locally.
function aiDevMock(): Plugin {
  return {
    name: "ai-dev-mock",
    configureServer(server) {
      server.middlewares.use("/api/generate-words", (req, res) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          res.setHeader("Content-Type", "application/json");
          try {
            const parsed = JSON.parse(body || "{}");
            const count = Math.min(25, Math.max(1, Number(parsed.count) || 10));
            const sourceName = getLanguage(parsed.sourceLanguage)?.name ?? parsed.sourceLanguage ?? "source";
            const targetName = getLanguage(parsed.targetLanguage)?.name ?? parsed.targetLanguage ?? "target";
            const words = Array.from({ length: count }, (_, i) => ({
              source: `${sourceName} word ${i + 1}`,
              target: `${targetName} translation ${i + 1}`,
              grammar: "noun",
              example: `Sample ${sourceName} sentence for word ${i + 1}.`,
            }));
            res.end(JSON.stringify({ words, remaining: 2, limit: 3 }));
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "generation", message: "Mock generation failed" }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    aiDevMock(),
    VitePWA({
      registerType: "autoUpdate",
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
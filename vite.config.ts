import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["vite.svg", "sql-wasm.wasm"],
      manifest: {
        name: "LearnY!",
        short_name: "LearnY",
        description: "Turn vocabulary lists into interactive study sessions.",
        theme_color: "#1e1e2e",
        background_color: "#1e1e2e",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "vite.svg",
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
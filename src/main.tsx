import React from "react";
import ReactDOM from "react-dom/client";
import { initDatabase } from "@/services/database";
import { applyTheme, useUiStore } from "@/stores/uiStore";
import "@/lib/locales";
import { applyDocumentLang } from "@/lib/i18n";
import App from "./App";
import "./index.css";

// Apply persisted theme before first paint to avoid a flash of the wrong theme.
applyTheme(useUiStore.getState().theme);
applyDocumentLang(useUiStore.getState().locale);

async function bootstrap() {
  // Initialize the database (sql.js wasm + OPFS + migrations) before first
  // render so the first pages can query it without a loading gate.
  await initDatabase();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
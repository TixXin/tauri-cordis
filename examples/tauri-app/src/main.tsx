import { invoke } from "@tauri-apps/api/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// With NOTES_SELFTEST=1 the window drives itself and reports (see selftest.ts).
void invoke<boolean>("selftest_wanted").then(async (wanted) => {
  if (wanted) await (await import("./selftest")).run();
});

import { invoke } from "@tauri-apps/api/core";
import { hostState, pluginList } from "./plugins";

const WORD_COUNT = "@demo/word-count";

const EXPECTED = {
  plugins: { notes: "running", [WORD_COUNT]: "running" },
  panel: "2 notes, 6 words",
  panelAfterAdd: "3 notes, 10 words",
  notes: ["Buy milk", "Read the tauri-cordis README", "added by the self-test"],
  stateWhenOff: "disabled",
  panelWhenOff: null,
  panelBackOn: "3 notes, 10 words",
};

const panel = () => document.querySelector('[data-slot="main.panel/v1"]')?.textContent || null;
const notes = () => [...document.querySelectorAll(".note-list li")].map((item) => item.textContent);
const states = () => Object.fromEntries(pluginList.get().map((plugin) => [plugin.id, plugin.state]));

async function until<T>(what: string, read: () => T | null | undefined | false): Promise<T> {
  const deadline = Date.now() + 15_000;
  for (;;) {
    const value = read();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** Uses the window the way a person would, and tells Rust what it saw. */
export async function run() {
  const seen: Record<string, unknown> = {};
  try {
    await until("the window to reach the plugin host", () => hostState.get() === "open");
    const toggle = await until("the word-count switch", () => document.querySelector<HTMLInputElement>(".plugins input"));
    if (!toggle.checked) toggle.click();
    await until("word-count to run", () => states()[WORD_COUNT] === "running");
    seen.plugins = states();
    seen.panel = await until("the plugin's panel", panel);

    const form = document.querySelector<HTMLFormElement>("form.add")!;
    form.querySelector("input")!.value = "added by the self-test";
    form.requestSubmit();
    seen.panelAfterAdd = await until("the panel to count the new note", () => panel() !== seen.panel && panel());
    seen.notes = await until("the new note in the list", () => notes().length === 3 && notes());

    toggle.click();
    seen.stateWhenOff = await until("word-count to be switched off", () => states()[WORD_COUNT] === "disabled" && "disabled");
    await until("the panel to go away", () => panel() === null);
    seen.panelWhenOff = panel();

    toggle.click();
    seen.panelBackOn = await until("the panel to come back", panel);
  } catch (error) {
    seen.error = String(error);
  }
  const ok = JSON.stringify(seen) === JSON.stringify(EXPECTED);
  await invoke("selftest_report", { result: { ok, ...seen } });
}

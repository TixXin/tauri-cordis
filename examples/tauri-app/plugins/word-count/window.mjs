// React comes from the app, so the plugin and the window share one copy. The app serves it at this path (assets.rs).
// This file is written by hand, so it names the path. With a build step you write `import ... from "react"`
// and `tauri-cordis-plugin build` puts the path in for you.
import { createElement, useSyncExternalStore } from "/__shared/react.js";

export default function apply(ctx) {
  let summary = null;
  const listeners = new Set();
  const update = (next) => {
    summary = next;
    for (const listener of listeners) listener();
  };
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  // `ctx.host` reaches this plugin's own host.mjs.
  ctx.host.on("updated", update);
  ctx.host.call("summary").then(update);

  function Panel() {
    const current = useSyncExternalStore(subscribe, () => summary);
    return current && createElement("p", null, `${current.notes} notes, ${current.words} words`);
  }

  // Whatever is added through `ctx` is taken away again when the plugin is switched off.
  ctx.slots.add("main.panel/v1", { id: "word-count", component: Panel });
}

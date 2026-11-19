import { SlotItems } from "tauri-cordis/client/react";
import { Notes } from "./Notes";
import { PluginList } from "./PluginList";
import { hostState, slots } from "./plugins";
import { useStore } from "./store";

export function App() {
  const state = useStore(hostState);
  return (
    <main>
      <section>
        <h1>Notes</h1>
        <Notes connected={state === "open"} />
      </section>
      <aside>
        <h2>
          Slot <code>main.panel/v1</code>
        </h2>
        {/* Renders whatever plugins have put into the slot, each item behind its own error boundary. */}
        <div className="slot" data-slot="main.panel/v1">
          <SlotItems registry={slots} name="main.panel/v1" />
        </div>
        <h2>Plugins</h2>
        <PluginList />
        <p className="host">Plugin host: {state}</p>
      </aside>
    </main>
  );
}

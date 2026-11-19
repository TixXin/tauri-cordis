import { invoke } from "@tauri-apps/api/core";
import { pluginList } from "./plugins";
import { useStore } from "./store";

const WORD_COUNT = "@demo/word-count";

export function PluginList() {
  const plugins = useStore(pluginList);
  return (
    <ul className="plugins">
      {plugins.map((plugin) => (
        <li key={plugin.id}>
          <span className="id">{plugin.id}</span>
          <span className="kind">{plugin.kind}</span>
          <span className={`state ${plugin.state}`}>{plugin.state}</span>
          {plugin.id === WORD_COUNT && (
            // Rust rewrites plugins.yml; the host sees the change and starts or stops the plugin.
            <input
              type="checkbox"
              role="switch"
              aria-label={`Enable ${plugin.id}`}
              checked={plugin.state !== "disabled"}
              onChange={(event) => void invoke("set_word_count_enabled", { enabled: event.currentTarget.checked })}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

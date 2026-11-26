# tauri-cordis

**Let the people who use your Tauri app extend it.** Built-in features and third-party extensions are the same kind of thing, a plugin, and each one can be switched on, off or replaced while the app is running.

This is the JavaScript half: the plugin API, the Node host that plugins run in, and the client your windows use. The Rust half is the [`tauri-cordis` crate](https://crates.io/crates/tauri-cordis). Full README, guides and an example app: **[github.com/TixXin/tauri-cordis](https://github.com/TixXin/tauri-cordis)**.

```bash
npm install tauri-cordis
```

It is the plugin runtime taken out of [Fuyu](https://github.com/TixXin/fuyu), a desktop island whose 22 built-in features and 12 official market plugins all run on this architecture.

> Not a `tauri-plugin-*`. A Tauri plugin is compiled into your app by you. This is for code your users install after the app has shipped.

## Entry points

| Import | For | What is in it |
|---|---|---|
| `tauri-cordis` | Plugins | `Context`, `Service`, and the types of everything on `ctx` |
| `tauri-cordis/services` | Plugins and apps | `defineService`, the built-in service definitions |
| `tauri-cordis/host` | Apps | `startHost`, status, safe mode, bisect; `host/main.mjs` is the process your shell starts |
| `tauri-cordis/client` | Apps | `connectHost`, `createLoader`, `createBridge`, `createServiceProxy`, `createWindowServices`, `createSlots` |
| `tauri-cordis/client/react` | Apps | `SlotItems`, `useSlotItems`, `installShared` |
| `tauri-cordis/protocol` | Apps | Protocol versions, close codes, shared module names |

## A plugin

```ts
// host part: runs in the Node host
import type { Context } from "tauri-cordis";
import { notesV1 } from "./services";

export const name = "word-count";
export const inject = ["clients", "notes/v1"]; // start only once notes/v1 is provided

export async function apply(ctx: Context) {
  const notes = ctx.services.get(notesV1);
  let count = (await notes.list()).length;

  ctx.clients.handle("count", () => count);
  notes.on("added", () => {
    count += 1;
    ctx.clients.publish("changed", count);
  });
}
```

```tsx
// window part: runs in a WebView
import { useEffect, useState } from "react";
import type { Context } from "tauri-cordis";

export default function apply(ctx: Context) {
  function Count() {
    const [count, setCount] = useState(0);
    useEffect(() => {
      void ctx.host.call<number>("count").then(setCount);
      const off = ctx.host.on("changed", setCount);
      return () => void off();
    }, []);
    return <span>{count} notes</span>;
  }

  ctx.slots.add("main.panel/v1", { id: "word-count", component: Count });
}
```

Neither file cleans up after itself. When the plugin is switched off, the handler, the subscription and the slot item go with it.

## Read next

- [Concepts](https://github.com/TixXin/tauri-cordis/blob/main/docs/concepts.md)
- [Adding it to your app](https://github.com/TixXin/tauri-cordis/blob/main/docs/getting-started.md)
- [Writing a plugin](https://github.com/TixXin/tauri-cordis/blob/main/docs/writing-plugins.md)
- [Security model](https://github.com/TixXin/tauri-cordis/blob/main/docs/security.md): plugins are not sandboxed. Read this before you choose it.
- [Guarantees](https://github.com/TixXin/tauri-cordis/blob/main/docs/guarantees.md): what the runtime promises, each with its test.
- [Stability](https://github.com/TixXin/tauri-cordis/blob/main/docs/stability.md): this is 0.x, and some defaults are still fixed.

Requires Node 22.15 or newer for the host. The kernel is [Cordis](https://github.com/cordiverse/cordis), vendored in `vendor/` with its license.

## License

MIT

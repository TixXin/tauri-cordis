# Writing a plugin

For people writing a plugin for an app that uses tauri-cordis. If you are the app's developer, start with [Adding it to your app](./getting-started.md). The ideas behind this page are in [Concepts](./concepts.md).

Which services and slots exist is up to the app: read its plugin documentation for the names. This page covers what is the same everywhere.

## Start a project

```bash
npm create tauri-cordis-plugin@latest my-plugin -- --scope your-github-name
cd my-plugin
npm install
```

You get:

```text
my-plugin/
├── package.json     the manifest
├── assets/icon.svg
└── src/
    ├── host.ts      runs in the app's Node host
    ├── main.tsx     runs in the window called "main"
    └── styles.css
```

`--window <name>` and `--slot <name>` choose another window and slot for the UI part.

## The manifest

The manifest is `package.json`. The fields npm knows stay where they are; the rest go under one key. In 0.2 that key is `fuyu` for every app (see [stability](./stability.md#names-inherited-from-fuyu)).

```json
{
  "name": "@your-github-name/my-plugin",
  "version": "0.1.0",
  "type": "module",
  "license": "MIT",
  "repository": "github:your-github-name/my-plugin",
  "engines": { "fuyu": ">=0.1.0" },
  "fuyu": {
    "manifest": 1,
    "displayName": { "en": "My plugin", "zh-CN": "我的插件" },
    "description": { "en": "Counts notes", "zh-CN": "统计笔记条数" },
    "icon": "assets/icon.svg",
    "categories": ["utilities"],
    "host": "dist/host.js",
    "client": { "main": "dist/main.js" },
    "inject": { "required": ["notes/v1"] },
    "slots": ["main.panel/v1"]
  }
}
```

| Field | Meaning |
|---|---|
| `name` | `@scope/name`. The scope is the publisher. |
| `engines` | The app versions the plugin works with, as a semver range. |
| `displayName`, `description` | Text per locale. `en` and `zh-CN` are both required in 0.2. |
| `host` | The built host module. Its source is `src/host.ts` (the same stem under `src/`). Leave it out for a plugin that is UI only. |
| `client` | One built module per window, by window name. Source: `src/<name>.tsx`. |
| `inject.required`, `inject.optional` | Services the plugin uses. It does not start until the required ones are provided. |
| `provides`, `replaces` | Services the plugin offers, and services of the app it takes over. |
| `slots` | Slots it puts components into. |
| `commands` | Commands with a title and an optional default key binding. |
| `network` | Hosts it talks to. `ctx.http.fetch` refuses others. |
| `config` | Path to a JSON Schema for its settings. |
| `platforms` | `windows`, `macos`, `linux`. Leave it out for all. |
| `experimental` | Experimental interfaces it uses. Such a plugin loads only from a development folder. |

`nodeApis` and `builtWith` are written by the build. Do not add them by hand.

What a plugin registers at run time is compared with what it declared. Anything missing shows up as `undeclared` in the plugin's status, and `check` warns about it.

## The host part

```ts
import type { Context } from "tauri-cordis";

export const name = "my-plugin";
export const inject = ["clients"];

export default function apply(ctx: Context) {
  let ticks = 0;
  ctx.clients.handle("ping", () => ({ ticks }));
  ctx.setInterval(() => {
    ticks += 1;
    ctx.clients.publish("tick", { ticks });
  }, 1000);
}
```

This is a Node module. You can import from `node:*` and from npm packages; the build bundles them.

What `ctx` offers:

| | |
|---|---|
| `ctx.services.get(def)` / `.provide(def, impl)` | Use or offer a versioned service. |
| `ctx.clients.handle(method, fn)` | Answer calls from your window part. |
| `ctx.clients.publish(topic, data)` | Send an event to your window part. |
| `ctx.setTimeout`, `ctx.setInterval`, `ctx.sleep` | Timers that stop with the plugin. |
| `ctx.effect(() => cleanup)` | Anything else that needs undoing: a watcher, a child process, a socket. |
| `ctx.on(event, listener)` | Kernel events. |
| `ctx.config.get()` / `.set(patch)` / `.onChange(fn)` | Settings, checked against your schema and saved per plugin. |
| `ctx.commands.register(id, fn, meta)` | A command the user can run or bind to a key. |
| `ctx.http.fetch(url, init)` | `fetch` limited to the hosts in `network`. |
| `ctx.dataDir` | A folder that belongs to this plugin. |
| `ctx.windows` | Experimental: windows of your own. |

Do not keep state in module-level variables that must survive a reload. `apply` runs again every time the plugin starts, and the module may be imported fresh.

Do not clean up by hand what you registered through `ctx`. Do wrap anything else in `ctx.effect`, or it will outlive the plugin:

```ts
ctx.effect(() => {
  const watcher = watch(file, onChange);
  return () => watcher.close();
});
```

## The window part

```tsx
import { useEffect, useState } from "react";
import type { Context } from "tauri-cordis";
import "./styles.css";

function Panel({ ctx }: { ctx: Context }) {
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    void ctx.host.call<{ ticks: number }>("ping").then((res) => setTicks(res.ticks));
    const off = ctx.host.on("tick", (data: { ticks: number }) => setTicks(data.ticks));
    return () => void off();
  }, [ctx]);
  return <div className="card">Ticks: {ticks}</div>;
}

export default function apply(ctx: Context) {
  ctx.slots.add("main.panel/v1", { id: "my-plugin:panel", component: () => <Panel ctx={ctx} /> });
}
```

- This is a browser module. No Node here: do the work in the host part and call it with `ctx.host.call`.
- `react` and `react/jsx-runtime` resolve to the app's copy at run time. Do not bundle your own React.
- `ctx.slots.add` fails with `no-slot` if the window has no slot of that name, and with `too-many` past the slot's per-plugin limit.
- A slot may pass props to your component and may define metadata fields on the item (a title, an icon). Both are the app's contract for that slot.
- Imported CSS is injected when the plugin loads and removed when it stops. Prefix your class names; the stylesheet is not scoped.

## The CLI

`@tauri-cordis/cli` installs the `tauri-cordis-plugin` command. The scaffold wires it to npm scripts.

| Command | What it does |
|---|---|
| `dev` | Builds, registers the plugin in the app's `plugins.yml` as a development plugin, and rebuilds on every change. Needs `--data-dir <folder>`: the app's plugin data folder. `--clean` removes the entry again. |
| `build` | Writes `build/package/`: the manifest with `nodeApis` filled in, `dist/`, assets, README. |
| `check` | The manifest, a trial build, and the same scan a market runs. `--market` checks as strictly as a market does. |
| `pack` | Builds, then writes one package file. The same source gives the same bytes. `--sign` adds your signature. |
| `review <old> <new>` | Compares two versions (folders or git commits) the way a market review does, and prints what changed and how risky it looks. Use `-` as the old side for a first release. |
| `keygen` | Creates your signing key once and prints the public key. |
| `sign` | Signs a commit for a market submission, or adds your signature to a package file. |

Exit codes: 0 done, 1 errors or a red review, 2 bad arguments.

## Publishing

How plugins reach users is the app's decision. The tools support two ways:

- **A market.** You submit a repository and a commit. The market builds the package from that source, reviews it against your previous version, signs it, and lists it. Users get updates after a cooldown.
- **A file.** You run `pack` and hand the file to people. Whether the app accepts files from outside its market, and how it warns, is up to the app.

Either way, read [the security model](./security.md): your plugin runs with the user's permissions, and the review is what stands between your code and their machine. Keep dependencies few, avoid install scripts, and declare every host you talk to.

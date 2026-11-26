# Adding it to your app

This page takes a Tauri 2 app with a React window and adds a plugin host to it, in seven steps. Each step works before the next one exists. Every snippet is cut from [`examples/tauri-app`](../examples/tauri-app), which runs; when a detail here is too short, read the file it names.

Read [Concepts](./concepts.md) first if the words *host*, *service* and *slot* are new.

## What the library does, and what your app does

| The library | Your app |
|---|---|
| Finds a Node on the machine, or downloads one and checks its hash | Decides where the download is kept |
| Starts the host process, pings it, restarts it with backoff | Says what happens to the host when the app is killed (`Containment`) |
| Serves your Rust functions to built-in plugins | Writes those functions |
| Runs the host: plugins, services, the socket for windows | Ships the host script, its dependencies and your built-in plugins inside the app bundle |
| Connects a window, loads plugin window code, renders slots | Serves plugin window files to the WebView through a URI scheme you register |
| Reads `plugins.yml` and the `packages/` folder | Puts packages there and edits `plugins.yml` (install, remove, on, off) |

The crate does not depend on `tauri`. Everything that touches Tauri (a command, a URI scheme, the CSP) is code you write, and the example has it in about 250 lines of Rust.

## 1. Dependencies

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri-cordis = "0.2"
ts-rs = "12"          # #[host_service] describes its types to TypeScript in test builds
```

```bash
pnpm add tauri-cordis
```

The host needs Node 22.15 or newer at run time. Your users do not have to install it: step 2 finds one or downloads one.

## 2. Start the host

```rust
use std::{ffi::OsString, sync::Arc};
use tauri_cordis::{node_for_host, official_download, Event, HostSpec, HostState, NoContainment, NodeSearch, Serve, Supervisor, Timing, MINIMUM_NODE};

// Looks on the machine first (PATH and the usual install places); downloads an official build into `data` if there is none.
let node = node_for_host(&NodeSearch::from_env(), MINIMUM_NODE, &data, official_download(None), &mut |_progress| {})?;

let args: Vec<OsString> = vec![
    "--disallow-code-generation-from-strings".into(), // a Node flag: no eval in the host
    HOST_SCRIPT.into(),                               // tauri-cordis/src/host/main.mjs
    "--dir".into(), plugins_dir.clone().into(),       // plugins.yml, installed packages, each plugin's data
    "--builtins".into(), BUILTINS.into(),             // the folder with builtins.json (step 4)
    "--app-version".into(), env!("CARGO_PKG_VERSION").into(),
    "--watch".into(),                                 // read plugins.yml again when it changes
];
let spec = HostSpec { program: node.path, args, env: Vec::new(), current_dir: None };

let supervisor = Supervisor::start_serving(
    move |_generation| spec.clone(), // asked again on every restart
    Arc::new(NoContainment),
    Timing::default(),
    Some(Arc::new(serve)),           // step 3; `None` if plugins get nothing from Rust
    |event| match event {
        Event::State(HostState::Ready { pid, .. }) => eprintln!("[host] ready (pid {pid})"),
        Event::State(state) => eprintln!("[host] {state:?}"),
        Event::Notification { method, params } => eprintln!("[host {method}] {params}"),
        Event::Stderr(line) => eprintln!("[host] {line}"),
    },
)?;
```

Full version: [`src-tauri/src/host.rs`](../examples/tauri-app/src-tauri/src/host.rs).

- Call `node_for_host` off the main thread. It probes several paths and may download.
- Keep the `Supervisor` in Tauri state and call `supervisor.stop()` on `RunEvent::Exit`.
- Do not print `HostState::Ready` with `{:?}`. Its `ready` field holds the socket token.
- The host exits by itself when its pipe to your app closes, and the supervisor hides the console window on Windows. `NoContainment` is enough to try things out; see [Before you ship](#before-you-ship).

Run the app. `[host] ready` means this step is done.

## 3. Give plugins something from Rust

```rust
use tauri_cordis::host_service;

#[host_service("storage.write", inject(notes))]
fn write(notes: Notes, text: String) -> Result<Note, String> {
    // ...
}
```

```rust
let mut serve = Serve::registered()?; // every #[host_service] function in the binary
serve.manage(Notes::default());       // what `inject(notes)` receives
```

Parameters are read by name from the call's JSON, except those listed in `inject(...)`, which come from `Serve::manage`. Parameter and return types need `serde` and `#[derive(ts_rs::TS)]`. `AppHandle` cannot be a parameter; put what the function needs behind a `Clone` type and manage that.

Only built-in plugins can call these (`ctx.rust.call`). A third-party plugin that tries gets `forbidden`. That is the point of the next step: Rust is reached through a service a built-in plugin provides, so third-party plugins and your own windows use one interface.

Full version: [`src-tauri/src/storage.rs`](../examples/tauri-app/src-tauri/src/storage.rs).

## 4. A built-in plugin and a service

The service, in a file the plugin and the window both import:

```js
// plugins/services.mjs
import { defineService } from "tauri-cordis/services";

export const notesV1 = defineService("notes/v1", {
  methods: { list: true, add: true },
  events: { added: true },
});
```

The plugin:

```js
// plugins/builtins/notes/host.mjs
import { notesV1 } from "../../services.mjs";

export const name = "notes";

export function apply(ctx) {
  const provider = ctx.services.provide(notesV1, {
    list: () => ctx.rust.call("storage.read"),
    add: async (params) => {
      const note = await ctx.rust.call("storage.write", { text: params?.text });
      provider.emit("added", note);
      return note;
    },
  });
}
```

And the list the host reads from the `--builtins` folder:

```json
{
  "format": 1,
  "plugins": [
    {
      "id": "notes",
      "kind": "builtin",
      "root": "notes",
      "host": "host.mjs",
      "provides": ["notes/v1"]
    }
  ]
}
```

`kind` is `builtin` (the user may switch it off) or `essential` (they may not). A built-in plugin needs no `package.json`.

## 5. Connect a window

The window has to learn the host's port and token, and they change every time the host restarts. One Tauri command does it:

```rust
#[derive(serde::Serialize)]
pub struct Connection { port: u64, token: String }

#[tauri::command]
pub fn host_connection(host: State<Host>) -> Option<Connection> {
    let HostState::Ready { ready, .. } = host.supervisor.get()?.state() else { return None };
    Some(Connection { port: ready["windows"]["port"].as_u64()?, token: ready["windows"]["token"].as_str()?.to_owned() })
}
```

In the window:

```ts
import { invoke } from "@tauri-apps/api/core";
import { connectHost, createServiceProxy, createWindowServices } from "tauri-cordis/client";
import type { HostConnection, HostTarget } from "tauri-cordis/client";
import { notesV1 } from "../plugins/services.mjs";

let connection: HostConnection | null = null;
const call = <T>(method: string, params?: unknown, options?: { timeoutMs?: number }) =>
  connection?.call<T>(method, params, options) ?? Promise.reject(new Error("the plugin host is not connected"));

const proxy = createServiceProxy(call);
export const notes = createWindowServices({ remote: proxy }).get(notesV1);

connection = connectHost({
  resolve: () => invoke<HostTarget | null>("host_connection"), // asked again on every reconnect
  window: "main",
  onSnapshot(snapshot) {
    proxy.update(snapshot.services);
  },
  onEvent(name, data) {
    if (name === "services") proxy.update(data);
    if (name === "service") proxy.deliver(data);
  },
  onState(state) {
    if (state === "open") void proxy.resubscribe();
  },
});
```

Now `await notes.list()` and `notes.on("added", ...)` work from your own UI.

Three things to get right:

- **CSP.** Add `ws://127.0.0.1:*` to `connect-src`.
- **Origins.** The host accepts sockets only from `tauri://localhost`, `http://tauri.localhost` and `https://tauri.localhost`. Under `tauri dev` the page comes from your dev server, so pass `--origin http://localhost:<port>` to the host in dev builds. `--origin` replaces the list; it does not add to it. The example passes it only when `tauri::is_dev()`.
- **Resubscribe in `onState`, not in `onSnapshot`.** In 0.2 `onSnapshot` runs just before the connection counts as open, and a call made then is dropped. Subscriptions made before the socket opened, or held across a host restart, come back only if `resubscribe()` runs on `open`.

## 6. Let plugin UI into the window

Plugin window code is not in your bundle; it sits in the user's data folder. The WebView has to import it from somewhere, and that is a URI scheme you register:

```rust
tauri::Builder::default()
    .register_uri_scheme_protocol("notes-plugin", |context, request| {
        let host = context.app_handle().try_state::<Host>();
        assets::respond(host.as_deref().map(|host| host.dir.as_path()), &request)
    })
```

[`src-tauri/src/assets.rs`](../examples/tauri-app/src-tauri/src/assets.rs) is 54 lines and can be copied. What it has to do:

- Serve files under `<dir>/packages/` and nothing else. Resolve `..` and links before checking, so `plugins.yml` and plugins' private data stay out of reach.
- Answer `HEAD` as well as `GET`, with a content type that contains `javascript` for `.js` and `.mjs`. The loader checks before importing.
- Send `Access-Control-Allow-Origin`. The page and the scheme are different origins.
- Serve the two React shims from `tauri-cordis/src/client/shims/` at `/__shared/react.js` and `/__shared/react-jsx-runtime.js`. Plugins import React from there and get your window's copy.
- CSP: add the scheme to `script-src` and `connect-src` in both forms, `notes-plugin:` and `http://notes-plugin.localhost` (the second is how Windows spells it).

Then the window declares its slots and lets the loader fill them:

```ts
import { convertFileSrc } from "@tauri-apps/api/core";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { createBridge, createLoader, createSlots } from "tauri-cordis/client";
import { installShared } from "tauri-cordis/client/react";

export const slots = createSlots({ "main.panel/v1": { kind: "list", perPlugin: 1 } });
installShared({ react: React, jsxRuntime });

const bridge = createBridge(call);
const loader = createLoader({ registry: slots, bridge, base: convertFileSrc("", "notes-plugin").replace(/\/$/, "") });
const load = (clients) => void loader.sync(clients.filter((entry) => entry.window === "main"));
```

Add to the `connectHost` handlers from step 5:

```ts
onSnapshot(snapshot) { /* ... */ load(snapshot.clients); },
onEvent(name, data) {
  /* ... */
  if (name === "clients") load(data);
  if (name === "plugin") bridge.deliver(data);
},
```

And render the slot where it belongs:

```tsx
import { SlotItems } from "tauri-cordis/client/react";

<SlotItems registry={slots} name="main.panel/v1" />
```

Full version: [`src/plugins.ts`](../examples/tauri-app/src/plugins.ts), 68 lines.

## 7. Install and switch plugins

The host reads two things in `--dir`:

- `packages/<package name>/`, one folder per installed plugin, with its `package.json`.
- `plugins.yml`, the list of what should run:

```yaml
- id: "@demo/word-count"
  source: manual
  disabled: true
```

With `--watch`, editing the file is the whole interface. Remove `disabled` and the plugin starts; the host tells every window, and the loader imports its window code. Add it back and everything the plugin registered through `ctx` is taken away. Nothing restarts.

The snapshot's `plugins` list (and the `plugins` event) is what a plugin manager UI draws from: id, kind, state, and the reason when a plugin was rejected or stopped.

Installing from a file or a market means verifying the package first. That is what [`@tauri-cordis/manifest`](../packages/manifest) and [`@tauri-cordis/market`](../packages/market) are for; see the [security model](./security.md).

## Before you ship

The example runs from its checkout. A shipped app has more to do, and the library does not do it for you in 0.3:

- **Bundle the host.** `main.mjs` runs from `node_modules` with its dependencies. Put the `tauri-cordis` package (with its `vendor` folder and dependencies), your built-in plugins and your service definitions into the app's resources, and point `HOST_SCRIPT` and `--builtins` at `app.path().resource_dir()`. A bundler that produces one file works too; test it with `--disallow-code-generation-from-strings` on.
- **Containment.** Implement `Containment` so the host and anything it started die with the app even when the app is killed: a Job Object on Windows, a process group elsewhere. The crate has the hook, not the implementation.
- **Node on Linux.** `official_download` has archives for Windows and macOS. On Linux there is nothing to download, so the machine needs Node 22.15 or newer.
- **A Node override.** `NodeSearch::from_env` reads the environment variable `CORDIS_NODE` as an explicit path; see [stability](./stability.md#default-names).
- **Plugin manifests.** A third-party plugin's `package.json` uses the key `cordis`, whatever your app is called. [Writing a plugin](./writing-plugins.md) has the fields.
- **Slot names in the tools.** `createSlots` takes your slot names, but the `SlotName` type and `tauri-cordis-plugin check` know only the built-in set. Expect a cast in TypeScript and an "unknown slot" finding from `check`.

## Checking that it works

The example has a self-test worth copying the idea of: with `NOTES_SELFTEST=1` the window adds a note, switches the plugin off and on, reports what it saw to Rust as JSON, and the process exits 0 or 1.

```bash
NOTES_SELFTEST=1 pnpm --filter tauri-cordis-example-notes tauri dev
```

It has been run on macOS. The Windows and Linux paths in the example are written but not yet run.

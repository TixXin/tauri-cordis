# Concepts

This page explains the ideas tauri-cordis is built from. For how to wire it into an app, see [Adding it to your app](./getting-started.md); for the plugin author's view, [Writing a plugin](./writing-plugins.md).

## Three places code runs

| Where | Language | What lives there |
|---|---|---|
| **Shell** | Rust, in your Tauri app | Starts and watches the host. Offers native methods to built-in plugins (`#[host_service]`). |
| **Host** | Node, one headless process | The Cordis context, the service registry, and the host part of every plugin. |
| **Windows** | Your WebViews (React) | The slot registry, and the window part of every plugin that has UI. |

The shell and the host talk JSON-RPC over the host's stdin and stdout. Each window talks to the host over a WebSocket on `127.0.0.1`. The host picks a free port and a random token every time it starts, tells the shell in its `ready` message, and the shell hands both to the windows. A connection with the wrong token or from an origin that is not on the list is refused.

Tauri's own `emit` and `Channel` are not used for plugin traffic, so plugin events do not go through the WebView's IPC queue.

## A plugin

A plugin is a folder with a `package.json`. It can have two halves, and either one is optional:

- a **host part**, a Node module that exports `apply(ctx)` (and usually `name` and `inject`), and
- a **window part** per window, a browser module whose default export is `apply(ctx)`.

The host part does the work: files, network, timers, talking to other plugins. The window part draws. They talk to each other through `ctx.clients` on the host side and `ctx.host` on the window side.

There are three kinds:

| Kind | Who ships it | Can be switched off |
|---|---|---|
| `essential` | The app | No. The app does not work without it. |
| `builtin` | The app | Yes. Its services, timers and UI go away. |
| `third-party` | Anyone | Yes. |

Built-in plugins are listed in a `builtins.json` that ships with the app. Everything else is listed in `plugins.yml` in the data directory, which is the one source of truth for what is installed and what is switched on. The host can watch that file: edit it and plugins start or stop to match.

The only thing a built-in plugin can do that a third-party one cannot is call the shell (`ctx.rust`). Everything else is the same code path.

## Lifecycle

A plugin is in one of these states:

| State | Meaning |
|---|---|
| `loading` | Its module is being imported and `apply` is running. |
| `waiting` | A service it needs is not provided yet. The status says which. |
| `running` | `apply` finished. |
| `failed` | `apply` threw, or its file or manifest is wrong. The status has the error. |
| `disabled` | Switched off in `plugins.yml`. |
| `auto-disabled` | It raised 5 errors within 60 seconds. Off until the host restarts; `plugins.yml` is not changed. |
| `safe-mode`, `bisect` | Held back for this run by safe mode or by a bisect. Not a line of its code runs. |

Order of loading follows dependencies, not the order in the file. If A needs a service from B and B needs one from C, they start as C, B, A, and when C stops, A and B stop first.

## Managed effects

Everything a plugin sets up through `ctx` belongs to the plugin and is undone when it stops:

- `ctx.setTimeout`, `ctx.setInterval`, `ctx.sleep`
- `ctx.on(event, listener)`
- `ctx.services.provide(...)` and listeners added with `client.on(...)`
- `ctx.clients.handle(...)`, `ctx.commands.register(...)`, `ctx.config.onChange(...)`
- `ctx.slots.add(...)` in a window
- anything wrapped in `ctx.effect(() => { ...; return () => cleanup })`

This is Cordis's model, and it is the reason a plugin can be reloaded safely: there is no "remember to unsubscribe". Use `ctx.effect` for anything that is not on the list, such as a file watcher or a child process.

If `apply` throws, or the promise it returns rejects, whatever it had registered up to that point is undone too.

## Services

A service is a set of methods and events with a versioned name, declared once:

```ts
export const notesV1 = defineService<Methods, Events>("notes/v1", {
  methods: { list: true, add: { timeoutMs: 5000 } },
  events: { added: true },
});
```

- A plugin **provides** it with `ctx.services.provide(notesV1, impl)` and sends events with the returned `emit`.
- A plugin **uses** it with `ctx.services.get(notesV1)`. Every method returns a promise. Listing `"notes/v1"` in `inject` makes the plugin wait for a provider.
- A **window** uses the same definition through `createWindowServices`. A call goes to a provider in that window first and to the host otherwise, so a service can be implemented wherever it is cheapest.

Parameters, results and event data must be JSON. Calls have a timeout (30 seconds unless the definition says otherwise) and fail with a code, not just a message: `not-ready`, `no-method`, `bad-params`, `timeout`, `peer-gone`, `failed`. When a provider stops, calls that are still waiting fail at once with `peer-gone`.

The version is part of the name on purpose. `notes/v1` never changes shape once published; a breaking change is `notes/v2`, and a provider can offer both for a while.

### Replacing a built-in service

Only one plugin provides a given service at a time. A second provider fails to start, and its error names the plugin that already has it. A third-party plugin that wants to take over declares `replaces: ["notes/v1"]` in its manifest; the built-in provider's service is then switched off for as long as the replacement runs. A seam like this is how a user swaps, say, the app's translator for their own.

## Slots

A slot is a named place in a window where plugins can put a component:

```ts
const slots = createSlots({
  "main.panel/v1": { kind: "list", perPlugin: 2 },
  "main.status/v1": { kind: "single" },
});
```

```tsx
<SlotItems registry={slots} name="main.panel/v1" />
```

- `list` slots show every item sorted by `order`, then by registration. `max` caps the total, `perPlugin` caps one plugin's share.
- `single` slots show the item added last.
- An item added with the id of an existing one replaces it and gives it back when the replacement is removed.
- Each item renders inside its own error boundary and `Suspense`. If it throws, only that item shows the fallback.

Slots are versioned like services. The props a slot passes to its items are part of its contract.

## Health

The host keeps count per plugin: managed timers, listeners, services, window entries, errors, and an estimate of CPU time and of how long `apply` took. A window gets these numbers in its snapshot, which is enough to build a "what is each plugin doing" page.

- **Faults.** An uncaught exception or unhandled rejection is traced to a plugin by its stack. The host stays up. Five within a minute switch the plugin off for this run.
- **Safe mode.** `--safe third-party` runs only the app's own plugins; `--safe minimal` runs only essential ones.
- **Bisect.** The shell can ask the host to hold back a list of third-party plugins for this run, which is what a "find the plugin that broke it" flow needs.
- **Dev mode.** With `--dev`, the host swaps in a plugin's new code when its file changes.

The full list of what the runtime promises, with the test that holds each promise, is in [guarantees.md](./guarantees.md).

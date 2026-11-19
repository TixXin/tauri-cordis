# Guarantees

What the runtime promises to plugins and to the app that embeds it: the host process, its pipe to Rust, and the WebSocket it opens for windows. One promise per row, and every row names the test that holds it. A promise without a test is not on this list.

English | [简体中文](./guarantees.zh-CN.md)

- JavaScript tests are in `packages/tauri-cordis/test/` (the tables leave that prefix out). Rust tests are in `crates/tauri-cordis/`.
- Run them with `pnpm test` and `cargo test --workspace`.
- When a promise is added or changed, its test and this page change in the same commit.
- Numbers are identifiers, not an order. They are kept stable so that issues and commits can refer to them; that is why the sections are not in numeric order, and why there is a 39 and a 39a.

## Dependencies and start order

| # | Promise | Test |
|---|---|---|
| 1 | A plugin does not start until the services it needs are provided. Its state is `waiting` and says which service it waits for. | `guarantees.test.mjs` › a plugin does not start until the services it needs are provided, and says which one it waits for |
| 2 | Load order follows dependencies, not the order in `plugins.yml`. | `guarantees.test.mjs` › the load order follows dependencies, not the order in the configuration |
| 3 | A chain (A needs B, B needs C) starts as C, B, A. When C stops, A and B stop (A first) and become `waiting`. When C returns they start again as C, B, A. | `guarantees-more.test.mjs` › a dependency chain starts in order, stops above a provider that goes away, and starts again when it returns |
| 4 | When the provider of a service stops, its users stop and go back to `waiting`. When it returns, they restart on their own. | `guarantees.test.mjs` › when the provider of a service goes away its users stop, and start again when it comes back |
| 5 | A plugin installed outside the host's directory gets the same kernel as the host (`instanceof Context` holds). | `guarantees.test.mjs` › a plugin installed outside the host's directory gets the same kernel as the host |

## Service conflicts

| # | Promise | Test |
|---|---|---|
| 6 | A second provider of the same service fails to start with state `failed`, and the error names the service. The first provider is untouched. | `guarantees-more.test.mjs` › a second provider of the same service fails without touching the first, and its error names the service |
| 7 | The error also names the plugin that already provides the service, by its id in `plugins.yml`. | `guarantees-more.test.mjs` › the status of a conflicting provider names the plugin that already provides the service |

## Cleanup and rollback

| # | Promise | Test |
|---|---|---|
| 8 | When a plugin is disabled, each of its cleanups runs exactly once. Enable it and they are registered again; disable it and they run once more. | `guarantees.test.mjs` › every cleanup runs exactly once when a plugin is disabled, and again on the next start |
| 9 | A plugin that throws in `apply` is `failed` with the reason, and everything it had registered is undone. | `guarantees.test.mjs` › a plugin that throws while starting is reported as failed and what it registered is undone |
| 10 | The same holds for an async `apply` that rejects: effects and listeners registered before the `await` are undone. | `guarantees-more.test.mjs` › a plugin whose async apply rejects is failed, and its effects and listeners are undone |
| 11 | A plugin whose file is missing is `failed` and the error has the file name. It is never skipped silently. | `guarantees.test.mjs` › a plugin whose file is missing is reported as failed, not left silent |
| 12 | Timers inside `ctx.effect` and listeners added with `ctx.on` never fire after the plugin is disabled. | `guarantees-more.test.mjs` › timers in an effect and event listeners never fire after the plugin is disabled |
| 13 | The kernel gives plugins managed timers (`ctx.setTimeout`, `ctx.setInterval`, `ctx.sleep`) that are cleared when the plugin stops. A `sleep` still pending rejects with `inactive`. | `guarantees-more.test.mjs` › the kernel gives plugins managed timers that stop with them |
| 14 | Stopping the host runs the cleanup of every plugin, users before providers. | `guarantees-more.test.mjs` › stopping the host runs the cleanup of every plugin, dependents first |

## Configuration

| # | Promise | Test |
|---|---|---|
| 15 | Changing one plugin's `config` restarts only that plugin, with the new config. | `guarantees-more.test.mjs` › changing one plugin's config restarts only that plugin, with the new config |
| 16 | With watching on, editing `plugins.yml` disables and enables plugins to match. | `guarantees.test.mjs` › editing the configuration file disables and enables plugins |

## Nothing is left behind

| # | Promise | Test |
|---|---|---|
| 17 | Disabling and enabling one plugin 1000 times leaves no timers, listeners or effects, and the JS heap grows by less than 8 MB. | `guarantees.test.mjs` › loading and unloading a plugin 1000 times leaves no timers, listeners or effects behind |
| 18 | In a separate host process started with `--disallow-code-generation-from-strings`, 1000 loads and unloads leave the active handles and timers (`process.getActiveResourcesInfo()`) as they were; after GC the heap grows by less than 2 MB and external memory by less than 1 MB. Once the host stops, no handle remains. | `guarantees-churn.test.mjs` › in a host process, 1000 loads and unloads of a plugin leave the handles, timers and heap as they were |

Measured for row 18 on an Apple-silicon Mac with Node 26.12: after 50 warm-up rounds, the heap after GC goes from 8.7 MB to 9.2 MB over 1000 rounds and to 9.4 MB over 3000. Resident memory does rise, from 29 MB to about 120 MB, and then stays there: that is V8 growing its young generation under churn and macOS not reclaiming the pages until asked. It is bounded, so the test judges by heap, external memory and handles, not by RSS.

## Errors

| # | Promise | Test |
|---|---|---|
| 19 | Errors and warnings from the kernel, such as a plugin that failed to start, reach Rust as `log` notifications on the pipe. | `main.test.mjs` › the host passes on errors from the kernel, such as a plugin that failed |
| 20 | A listener that throws does not stop other plugins' listeners for the same event. | `guarantees-errors.test.mjs` › a listener that throws does not stop other plugins' listeners for the same event |
| 21 | An unhandled promise rejection in a plugin does not take the host down. | `guarantees-errors.test.mjs` › a stray promise rejection in a plugin does not take the host down |
| 22 | An uncaught throw in a plugin's timer callback does not take the host down. | `guarantees-errors.test.mjs` › an uncaught throw in a plugin's timer does not take the host down |
| 46 | Each plugin reports its managed timers, listeners and services, and an estimate of its CPU time and of how long `apply` took. | `guarantees-health.test.mjs` › each plugin reports its timers, listeners, services, CPU and apply time; `main-health.test.mjs` › a window gets the host's own numbers and each plugin's usage in its snapshot |
| 47 | A plugin that raises 5 errors within 60 seconds is switched off with state `auto-disabled` and the reason, and its effects are undone. `plugins.yml` is not rewritten, re-reading the configuration does not bring it back, and it loads normally after the host restarts. | `guarantees-health.test.mjs` › a plugin that keeps failing is switched off for this run only, without touching plugins.yml |
| 48 | Errors spread out beyond the window do not switch a plugin off. The count and the last error are still recorded. | `guarantees-health.test.mjs` › errors spread out beyond the window do not switch a plugin off |
| 49 | In the host process, stray rejections traced to a plugin by their stack count as its errors, and a plugin that keeps producing them is switched off. The host does not exit. | `main-health.test.mjs` › a plugin whose stray rejections keep coming is switched off and says why |

Row 20 relies on a local patch to the vendored Cordis: `emit` calls each listener in its own `try`/`catch` and logs the error against the plugin that owns the listener. See [`vendor/README.md`](../packages/tauri-cordis/vendor/README.md). An error that cannot be traced to any plugin is the kernel's own; the host exits and Rust restarts it.

## Safe mode and dev mode

| # | Promise | Test |
|---|---|---|
| 50 | Safe mode `third-party` keeps `essential` and `builtin` plugins. The rest get state `safe-mode`, which says the mode, and none of their code runs. | `guarantees-health.test.mjs` › safe mode third-party keeps built-in plugins and holds back the rest, saying why; `main-health.test.mjs` › the host started with --safe holds back third-party plugins and says so in ready |
| 51 | Safe mode `minimal` keeps only `essential` plugins. Plugins that need a held-back service are `waiting`. | `guarantees-health.test.mjs` › safe mode minimal keeps only essential plugins, and their users wait for what is held back |
| 52 | The host process started with an unknown `--safe` value loads every plugin instead of failing to start. `startHost` itself refuses unknown values. | `main-health.test.mjs` › an unknown --safe value starts every plugin instead of failing the host; `guarantees-health.test.mjs` › an unknown safe mode is refused |
| 53 | With `--dev` (and Node's `--expose-internals`), a plugin's new code is swapped in when its file changes. | `main-health.test.mjs` › with --dev the host swaps in a plugin's new code when its file changes |

## The host process and its pipe

| # | Promise | Test |
|---|---|---|
| 23 | The host sends `ready` once the kernel and the configured plugins are loaded, with the protocol version, plugin status, and the port and token for windows. It answers `ping` and `status`. | `main.test.mjs` › the host says it is ready with its plugins, and answers ping and status |
| 24 | Whatever plugins and the kernel print goes to stderr. Stdout carries only the protocol. | `main.test.mjs` › what plugins print goes to stderr, so the pipe to Rust stays clean |
| 25 | When its stdin closes, the host stops its plugins and exits within 2 seconds. | `main.test.mjs` › the host stops its plugins and exits when its stdin closes |
| 26 | Asked to `stop`, the host answers `true` and exits with code 0. | `main.test.mjs` › the host exits when asked to stop |
| 27 | The host loads plugins with code generation from strings disallowed. | `host-flags.test.mjs` › the host runs with code generation from strings disallowed, as the release host does |
| 28 | The host loads plugins without `--expose-internals`. Only hot reload needs it. | `host-flags.test.mjs` › the host loads plugins without --expose-internals, which only hot reload needs |
| 29 | The base imports nothing but Node, the vendored kernel, `ws` and itself. | `boundary.test.mjs` › the base imports nothing but Node, the vendored kernel, ws and itself |
| 30 | A call on the pipe gets the handler's result. A thrown error comes back with its code. An unknown method answers `-32601`. | `rpc.test.mjs` › a call gets the handler's result, and a thrown error comes back with its code |
| 31 | When the other side goes away, every call waiting on it fails at once with `peer-gone`, without waiting for its timeout. | `rpc.test.mjs` › when the other side goes away, every call waiting on it fails at once with the reason; Rust: `rpc.rs` › a_waiting_call_fails_at_once_when_the_host_goes_away |
| 32 | Every call has a timeout and fails with `timeout`. | `rpc.test.mjs` › a call that gets no answer times out instead of hanging; Rust: `rpc.rs` › a_call_without_an_answer_times_out |

## Supervision from Rust

| # | Promise | Test |
|---|---|---|
| 33 | Once the host is ready it answers calls, and its stderr is passed on to Rust. | `tests/supervisor.rs` › the_host_becomes_ready_answers_calls_and_its_stderr_is_passed_on |
| 34 | A host that exits is started again at once. | `tests/supervisor.rs` › a_host_that_dies_is_started_again_at_once |
| 35 | A host that stops answering heartbeats is replaced. | `tests/supervisor.rs` › a_host_that_stops_answering_heartbeats_is_replaced |
| 36 | When a host keeps failing, the wait before each restart doubles from zero up to a cap. | `tests/supervisor.rs` › a_host_that_keeps_failing_waits_longer_each_time; `supervisor.rs` › the_first_restart_is_immediate_then_the_wait_doubles_up_to_the_cap |
| 37 | A host that never becomes ready is given up on after the deadline, for that attempt. | `tests/supervisor.rs` › a_host_that_is_never_ready_is_given_up_on_after_the_deadline |
| 38 | Stopping asks the host to stop by itself first. Calls made afterwards fail. | `tests/supervisor.rs` › stopping_asks_the_host_to_stop_and_calls_fail_afterwards |
| 39 | A host that exits is noticed without waiting for the next heartbeat. | `tests/supervisor.rs` › a_host_that_dies_is_noticed_without_waiting_for_the_next_heartbeat |

## Windows

| # | Promise | Test |
|---|---|---|
| 39a | A window with the right token gets a snapshot, its calls are answered, and events arrive in order. | `sockets.test.mjs` › a window with the token gets a snapshot, its calls answered and the events in order |
| 40 | An error thrown in a window's call comes back with its code. | `sockets.test.mjs` › a thrown error in a call comes back with its code |
| 41 | A connection from an origin that is not on the list is refused before it becomes a WebSocket. | `sockets.test.mjs` › an unknown origin is refused before the socket opens |
| 42 | A wrong token, a missing hello and a wrong protocol version are each closed with their own code. | `sockets.test.mjs` › a wrong token, a missing hello and a wrong protocol are each closed with their own code |
| 43 | When the host restarts on a new port with a new token, the window reconnects and gets a fresh snapshot. | `sockets.test.mjs` › when the host restarts on a new port and token, the window reconnects and gets a fresh snapshot |
| 44 | A window that notices it missed an event asks for a new snapshot instead of carrying on with a gap. | `sockets.test.mjs` › a window that misses an event asks for a snapshot instead of going on with a gap |
| 45 | A connected window hears about plugin state changes as they happen. | `main.test.mjs` › a window connected to the host hears about plugin changes as they happen |
| 54 | Slot items come out sorted by `order`, then by registration. A `single` slot keeps the last item. Items past `max` are cut, a plugin past `perPlugin` gets `too-many`, and adding to a slot that is not defined fails at once with `no-slot`. | `slots.test.mjs` › items come out in order, and a list slot shows at most its maximum; › a single slot shows only the item added last; › adding to a slot that does not exist fails at once and says which; › one plugin cannot fill a slot past its share, and built-in items have no share |
| 55 | An item added with an existing id replaces that item and records what it replaced; removing the replacement brings the old one back. Every item has its own error boundary, so one that throws while rendering shows the fallback for itself alone. | `slots.test.mjs` › adding an item with an existing id replaces it, records what was replaced, and brings the old one back when the replacement is removed; › an item that throws while rendering shows the fallback for that item alone, and the rest still render |
| 56 | The window loader checks that a file exists and has the right MIME type before `import()`. A plugin's slot items are removed before it is unloaded or replaced by a new version. One plugin failing to load does not affect the others in the window. | `loader.test.mjs` › a plugin's window code is loaded, puts its items in slots, and they go when the plugin goes; › a new version is loaded from a new address, and the old one's items are gone first; › a missing file, a module without a plugin and a plugin that throws are each reported, and the others still load |

## Services, the Rust channel, sources and bisect

| # | Promise | Test |
|---|---|---|
| 57 | Versioned services (`defineService`) check the declared methods and events and apply timeouts, in the host and in windows. When a provider stops, calls still pending fail at once with `peer-gone`, and event listeners go away with the plugin that added them. | `services.test.mjs` › a plugin provides a versioned service, another calls it and hears its events, and stopping the provider cleans up; `service-proxy.test.mjs` › a window calls a declared method by service name, within the declared time plus a little; `window-services.test.mjs` |
| 58 | Only built-in plugins may call Rust or listen to its events through `ctx.rust`; third-party plugins get `forbidden`. Calls can stream progress (`onProgress`), and pending calls fail at once with `peer-gone` when Rust goes away. | `rust.test.mjs` › a plugin calls Rust and gets the answer or Rust's own error code; › only built-in plugins may call Rust or listen to its events; third-party plugins are refused with forbidden |
| 59 | Built-in plugins load from `builtins.json`. `plugins.yml` cannot change a built-in plugin's `kind` or code path. Switching one off removes its services, timers, listeners and window entries. | `builtins.test.mjs` › built-in plugins run without an entry in plugins.yml, with the kind the app's list gives them; › entries in plugins.yml cannot make a plugin built-in or swap a built-in's code; › plugins.yml switches a built-in plugin off, and everything it set up goes with it |
| 60 | The `package.json` manifest is checked by source (`market`, `manual`, `dev`). Packages from the market or installed by hand are refused if they use `experimental` interfaces. Services or windows a plugin registers without declaring show up as `undeclared` in its status. | `sources.test.mjs` › a market or hand-installed package that uses experimental interfaces fails with the reason; the same code loads from a development folder; › services and windows a plugin did not declare show up in its status |
| 61 | A bisect (`host.bisect`) switches the listed third-party plugins off for this run only, with reason `bisect`. It does not rewrite `plugins.yml` and never switches off built-in or essential plugins. | `bisect.test.mjs` › a bisect switches the listed plugins off for this run only, says why, and brings them back when the list changes |
| 62 | A minimal application with none of Fuyu's code runs end to end: shell pipe, host process, a versioned service, a third-party plugin and a window slot. | `minimal-app.test.mjs` › a minimal application without Fuyu business code runs end-to-end across shell, host, services and window slots |

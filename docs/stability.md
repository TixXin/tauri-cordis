# Stability

tauri-cordis is 0.x. This page says what you can build on today, what may still move, and which names are left over from the app it came out of.

## Versions

- All npm packages and both crates are released together under one version number.
- Until 1.0, a **minor** release (0.2 to 0.3) may contain breaking changes, and each one is listed in [CHANGELOG.md](../CHANGELOG.md) under "Breaking". A **patch** release (0.2.0 to 0.2.1) does not.
- The two wire protocols have their own numbers: `HOST_PROTOCOL` (shell and host) and `WINDOW_PROTOCOL` (window and host). The host states them in its `ready` message and refuses a window that speaks another one, so a mismatch fails loudly at startup.

## What is stable

These are used in production by Fuyu and are meant to stay as they are. Changing one needs a new versioned name or a major release.

| Area | Stable surface |
|---|---|
| Plugin entry points | A host module exporting `apply(ctx)`, `name`, `inject`; a window module whose default export is `apply(ctx)` |
| Managed effects | `ctx.setTimeout`, `ctx.setInterval`, `ctx.sleep`, `ctx.on`, `ctx.effect` |
| Services | `defineService`, `ctx.services.provide` / `get` / `list`, error codes, the `name/vN` naming rule |
| Host and window messaging | `ctx.clients.add` / `handle` / `publish`, `ctx.host.call` / `on` |
| Slots | `createSlots`, slot rules, `ctx.slots.add`, `SlotItems`, `useSlotItems` |
| Rust | `Supervisor`, `HostSpec`, `Timing`, `Serve`, `#[host_service]`, `find_node`, `node_for_host` |
| Files | `plugins.yml`, `builtins.json` (format 1), the manifest (`manifest: 1`), the package layout |
| Guarantees | Every row in [guarantees.md](./guarantees.md) |

## What may change

| Area | Why |
|---|---|
| `ctx.windows`, `pluginWindowsV1`, the `plugin-window.view/v1` slot | Marked experimental. Packages from a market or installed by hand may not use them. |
| `ctx.commands`, `ctx.config`, `ctx.http` | New in 0.2. The shape is settled, details may be adjusted. |
| The props a slot passes to its items | Defined by the app, per slot. Version the slot name when you change them. |
| `@tauri-cordis/market` index format | Format 3 today. A change to it gets a new format number. |
| Default names | See below. |

## Default names

tauri-cordis was cut out of [Fuyu](https://github.com/TixXin/fuyu). Up to 0.2 several defaults still carried Fuyu's names; since 0.3 they are tauri-cordis's own. Some of them are still fixed. This is the list, with what you can do about each today.

| Name | Where it shows | In 0.3 |
|---|---|---|
| Manifest key `cordis` and `engines.cordis` in a plugin's `package.json` | The host, the CLI, the scaffolder | **Fixed in the host.** `validateManifest` and the build functions take `appKey`, but the host reads `cordis` only, so a plugin built with another key does not load. Use `cordis`. |
| Official scope `@cordis` | Manifest validation | `officialScope` option of `validateManifest`. |
| Package extension `.cordis` and the signature namespace `cordis` | `packDirectory`, `signPackage`, the CLI | `namespace` and `extension` options in `@tauri-cordis/manifest`. The CLI has no flag for them. |
| Signing key at `~/.tauri-cordis-plugin/signing.key`, environment variable `CORDIS_PLUGIN_SIGNING_KEY` | `keygen`, `sign`, `pack --sign` | Pass `--key <file>`. |
| `CORDIS_PLUGINS_V3_DIR` | `tauri-cordis-plugin dev` | Pass `--data-dir <folder>`. |
| The slot table `SLOTS` in `tauri-cordis/protocol` (`island.*`, `settings.*`) | Types, CLI checks | Pass your own rules to `createSlots`. The `SlotName` type still lists these slots, so TypeScript needs a cast for yours. |
| CSS variables `--tauri-cordis-plugin-*` (`SLOT_THEME`) | Plugin styles | Define them in your app's CSS under those names. |
| Format ids `tauri-cordis-plugin-review/1`, `tauri-cordis-plugin-commit/1` | Review reports, commit signatures | Identifiers only. |
| Locales `en` and `zh-CN` both required for `displayName` and `description` | Manifest validation | Fixed (`REQUIRED_LOCALES`). |
| Review findings written in Chinese | `@tauri-cordis/review`, `tauri-cordis-plugin review` | The `check`, `kind` and `tier` fields are stable; map them to your own text. |
| Environment variable `CORDIS_NODE` | `NodeSearch::from_env`, as an explicit path to Node | Build the `NodeSearch` yourself and set `explicit`. |
| `globalThis.__CORDIS_SHARED__` | `installShared` and the React shims | Internal. Nothing to change. |

The 0.3.0 entry in the [changelog](../CHANGELOG.md) lists every rename from 0.2. Letting an app choose the manifest key the host reads is not done yet.

## Requirements

| | Minimum |
|---|---|
| Node for the host | 22.15 (`MINIMUM_NODE`). The crate can download Node 26 when none is found. |
| Tauri | 2 |
| React, for slots | 19 |
| Platforms tested in CI | Windows, macOS, Linux |

## Vendored Cordis

The Cordis kernel in [`packages/tauri-cordis/vendor`](../packages/tauri-cordis/vendor) is a built copy of release-candidate versions (`cordis` 4.0.0-rc.13), with three small local patches listed in that folder's README. It is vendored so that a Cordis release cannot change the behavior behind the guarantees without the guarantee tests running first. Plugins import `Context` and `Service` from `tauri-cordis`, never from `cordis` directly.

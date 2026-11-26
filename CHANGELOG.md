# Changelog

All packages and crates share one version. Until 1.0, a minor release may contain breaking changes; they are listed under "Breaking".

## Unreleased

## 0.3.0

The source is now generated from Fuyu's repository by one export script, and CI checks that it matches (see [CONTRIBUTING.md](./CONTRIBUTING.md#where-the-code-comes-from)). This brings over everything Fuyu changed since 0.2.0, and the defaults no longer carry Fuyu's names.

### Breaking
- Manifest key `fuyu` and `engines.fuyu` → `cordis` and `engines.cordis`. The host only loads plugins written with the new key; rename the key in each plugin's `package.json` and build again.
- Official scope `@fuyu` → `@cordis`; package extension `.fuyu` and signature namespace `fuyu` → `.cordis` and `cordis`. Packages signed by 0.2 do not verify under 0.3 defaults; pack and sign them again, or pass `namespace` and `extension`.
- Signing key `~/.fuyu-plugin/signing.key` → `~/.tauri-cordis-plugin/signing.key`; `FUYU_PLUGIN_SIGNING_KEY` → `CORDIS_PLUGIN_SIGNING_KEY`. Move the key file or pass `--key`.
- Environment variables `FUYU_PLUGINS_V3_DIR`, `FUYU_NODE`, `FUYU_PLUGIN_HOST`, `FUYU_DPAPI_INPUT` → `CORDIS_*`.
- CSS variables `--fuyu-plugin-*` → `--tauri-cordis-plugin-*`; `globalThis.__FUYU_SHARED__` → `__CORDIS_SHARED__`; format ids `fuyu-plugin-review/1` and `fuyu-plugin-commit/1` → `tauri-cordis-plugin-review/1` and `tauri-cordis-plugin-commit/1`.
- The `fuyu-plugin` command is gone from `@tauri-cordis/cli`; use `tauri-cordis-plugin`.
- A third-party plugin that `replaces` a built-in service no longer switches the built-in service off when the configuration is read. The built-in one yields at run time, only while the replacement actually provides the service; if the replacement is stopped, held back by the bisect or safe mode, or fails to start, the built-in one stays on. The plugin status reports `replacedServices` and `disabledServices` as they are.

### Added
- Host extensions: `startHost({ extensions })` and `createLoader({ appServices })` let an app add its own injected services, window calls and status fields without changing the base.
- Brought over from Fuyu: plugin locale (`ctx.locale`), plugin secrets, an HTTP proxy for `ctx.http`, versioned service lookup, and in `@tauri-cordis/cli` the `icon`, `lint`, `preview` and `shots` tools; `@tauri-cordis/market` gains bundles.

### Changed
- `create-tauri-cordis-plugin` writes the `cordis` key and depends on `^0.3.0`.
- The download User-Agent is `tauri-cordis/<version>`, and the crate's error text no longer names Fuyu.

### Added
- `examples/tauri-app`: a Tauri 2 notes app with a window, a built-in plugin and a third-party plugin that can be switched off while it runs.
- Documentation: [concepts](./docs/concepts.md), [adding it to your app](./docs/getting-started.md), [writing a plugin](./docs/writing-plugins.md), [security model](./docs/security.md), [stability](./docs/stability.md).
- The [guarantees](./docs/guarantees.md) in English; the Chinese original is kept as `guarantees.zh-CN.md`.
- `README.zh-CN.md`, `CONTRIBUTING.md`, `SECURITY.md`, issue and pull request templates.
- `keywords` on every npm package.

### Changed
- The README no longer says the crate contains Job Object or process group containment, or serves plugin files. It provides the `Containment` hook; the implementation and the file protocol belong to the app (the example shows both).

## 0.2.0 (2026-11-18)

### Added
- `ctx.commands` and the `commands/v1` service: a command registry with `keybindings.json` overrides and a bridge for global hotkeys registered from Rust.
- `ctx.config` and the `plugin-config/v1` service: settings checked against a JSON Schema, defaults merged in, saved per plugin in `config.json`.
- `ctx.http.fetch`: an HTTP client that checks the hosts declared in `network`, with wildcard subdomains and rules for localhost.
- Experimental: `ctx.windows`, the `plugin-windows/v1` service and the `plugin-window.view/v1` slot.
- `@tauri-cordis/cli`: `check` reports unknown slots, invalid service names, and experimental interfaces used without being declared.

### Changed
- Releases are published through OIDC trusted publishing on npm and crates.io, with no stored tokens.

## 0.1.0 (2026-11-18)

First public release: six npm packages (`tauri-cordis`, `@tauri-cordis/manifest`, `@tauri-cordis/market`, `@tauri-cordis/review`, `@tauri-cordis/cli`, `create-tauri-cordis-plugin`) and two crates (`tauri-cordis`, `tauri-cordis-macros`).

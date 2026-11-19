# Changelog

All packages and crates share one version. Until 1.0, a minor release may contain breaking changes; they are listed under "Breaking".

## Unreleased

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

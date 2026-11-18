# `tauri-cordis`

**Everything-is-a-plugin** runtime base for **Tauri + Node.js + React** applications, powered by [Cordis](https://github.com/cordiverse/cordis) (MIT).

Built-in features and third-party extensions run as equal-privilege Cordis plugins with managed, disposable side effects:
- **Headless Node.js Host** supervised by Rust (stdio JSON-RPC, heartbeats, exponential backoff restarts, Job Object / process group containment, Node discovery & SHA-256 verified fallback download).
- **Direct Window WebSocket** (`127.0.0.1` with per-launch random token & `Origin` check — zero Tauri `emit` / `Channel` WebView memory leak).
- **Versioned Services & Seams** (`defineService("notes/v1", ...)`, `ctx.services.provide`, `ctx.services.get`, `createWindowServices`, conflict reporting & `replaces` handoff).
- **Typed Window Slots** (`createSlots`, `SlotItems` with per-item React `ErrorBoundary` + `Suspense`, deterministic ordering & replacement rollback).
- **End-to-End Plugin Supply Chain** (`@tauri-cordis/manifest`, `@tauri-cordis/market`, `@tauri-cordis/review`, `@tauri-cordis/cli`, `create-tauri-cordis-plugin`).
- **62 Tested Runtime Guarantees** — see [`docs/guarantees.md`](https://github.com/TixXin/tauri-cordis/blob/main/docs/guarantees.md).

---

## Architecture

```text
┌─────────────────────────────┐      stdio JSON-RPC       ┌─────────────────────────────────┐
│  Native Shell (Rust / Tauri)│ <-----------------------> │  Node.js Plugin Host (headless) │
│  - Supervisor & heartbeats  │                           │  - Cordis root context & loader │
│  - #[host_service] methods  │                           │  - Versioned service registry   │
│  - Allowlisted protocol     │                           │  - Managed timers / fault gate  │
└─────────────────────────────┘                           └─────────────────────────────────┘
               ^                                                           ^
               │ invoke (window geometry / OS ops)                         │ 127.0.0.1 WebSocket (token + Origin check)
               v                                                           v
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│  WebView Windows (React Clients)                                                          │
│  - Slot registry (createSlots / SlotItems, isolated ErrorBoundary per contributed item)   │
│  - Window services (createWindowServices: local window provider -> host fallback)         │
│  - Client module loader (createLoader with shared React shims)                            │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Packages & Crates

| Package / Crate | Registry | Description |
|---|---|---|
| `tauri-cordis` | npm | Core plugin API (`Context`, `Service`), Node host (`tauri-cordis/host`), window client & React slots (`tauri-cordis/client`, `tauri-cordis/client/react`), versioned services (`tauri-cordis/services`), protocol constants |
| `@tauri-cordis/manifest` | npm | `package.json` plugin manifest validator, deterministic zip packager, Ed25519 signatures |
| `@tauri-cordis/market` | npm | Signed market index & revocation list verification, serial monotonicity, expiry & cooldown version selector |
| `@tauri-cordis/review` | npm | Version-to-version source & bundle diff risk analyzer (green / yellow / red tiers) |
| `@tauri-cordis/cli` | npm | `tauri-cordis-plugin` CLI (`build`, `pack`, `check`, `dev`, `review`, `keygen`, `sign`) |
| `create-tauri-cordis-plugin` | npm | Project scaffolder (`npm create tauri-cordis-plugin@latest`) |
| `tauri-cordis` | crates.io | Rust host supervisor, Node locator/downloader, stdio JSON-RPC bridge, custom-protocol static asset server |
| `tauri-cordis-macros` | crates.io | `#[host_service]` procedural macro with `ts-rs` TypeScript declaration export |

---

## Quick Start & Minimal Example

Run the standalone 4-layer minimal application (shell JSON-RPC pipe + Node host subprocess + built-in `notes` service plugin + `@demo/word-count` window slot plugin):

```bash
pnpm install
node packages/tauri-cordis/examples/minimal-app/run.mjs
```

Run all JavaScript/TypeScript and Rust guarantee test suites:

```bash
pnpm check
cargo test
```

---

## Host Application Customization

`tauri-cordis` decouples host-app naming from the runtime core:

- **Manifest key & scope**: `validateManifest(pkg, { appKey: "myApp", officialScope: "my-app", categories })`
- **Package extension & signature**: `packDirectory(dir, { namespace: "my-app", extension: ".myapp" })`
- **Slot schema**: `createSlots(mySlotRules)`
- **Built-in catalog**: `startHost({ dir, builtins: "builtins/builtins.json", apiNames: ["my-app-plugin"] })`

---

## Publishing Releases

Releases are automated via [`.github/workflows/release.yml`](https://github.com/TixXin/tauri-cordis/blob/main/.github/workflows/release.yml) when pushing a `v*` tag (or running workflow dispatch), publishing crates in dependency order (`tauri-cordis-macros` -> `tauri-cordis`) and npm packages (`@tauri-cordis/manifest`, `@tauri-cordis/market`, `@tauri-cordis/review`, `tauri-cordis`, `@tauri-cordis/cli`, `create-tauri-cordis-plugin`) with `CARGO_REGISTRY_TOKEN` and `NPM_TOKEN`.

## License

[MIT](https://github.com/TixXin/tauri-cordis/blob/main/LICENSE)

# tauri-cordis (Rust crate)

The native side of [tauri-cordis](https://github.com/TixXin/tauri-cordis), a plugin runtime for Tauri apps. This crate starts and watches the Node process that plugins run in, and lets built-in plugins call methods you write in Rust.

```toml
[dependencies]
tauri-cordis = "0.2"
```

- **`Supervisor`** starts the host from a `HostSpec`, waits for `ready`, pings it, restarts it with backoff, and reports state through one callback. `call` and `emit` talk to it over JSON-RPC on stdio.
- **`find_node`** and **`node_for_host`** look for a Node that is new enough and, if there is none, download an official build and check its SHA-256.
- **`#[host_service("name")]`** turns a function into a method plugins can call. `Serve::registered()` collects them; parameters and results are typed with `serde` and exported to TypeScript through `ts-rs`.
- **`Containment`** is a hook for putting the host in a Job Object or process group. The crate ships `NoContainment`; the host also quits on its own when its stdin closes.

```rust
use tauri_cordis::host_service;

#[host_service("storage.write", inject(store))]
fn write(store: Store, text: String) -> Result<Note, String> {
    store.add(text)
}
```

The crate does not depend on `tauri`, so it also works in tests and in non-Tauri shells. Serving plugin files to the WebView is done in your app; [examples/tauri-app](https://github.com/TixXin/tauri-cordis/tree/main/examples/tauri-app) shows how.

Guide: [Adding it to your app](https://github.com/TixXin/tauri-cordis/blob/main/docs/getting-started.md). License: MIT.

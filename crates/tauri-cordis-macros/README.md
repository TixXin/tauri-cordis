# tauri-cordis-macros

The `#[host_service]` attribute for [tauri-cordis](https://github.com/TixXin/tauri-cordis). Use it through the `tauri-cordis` crate, which re-exports it.

```rust
use tauri_cordis::host_service;

#[host_service("app.version")]
fn version() -> String {
    env!("CARGO_PKG_VERSION").to_owned()
}

#[host_service("notes.add", timeout_ms = 1500, inject(store))]
fn add(store: Store, text: String) -> Result<Note, String> {
    store.add(text)
}
```

- The name is what plugins call: `ctx.rust.call("notes.add", { text })`.
- Parameters are read by name from a JSON object. `Option<T>` parameters are optional.
- `inject(...)` names parameters that come from state registered with `Serve::manage`.
- A `&Call` parameter gives access to progress and cancellation.
- `async fn` works. Errors can be any type that implements `ServiceFailure`.
- An `AppHandle` cannot be injected: methods are registered statically, and linking the Tauri runtime into every test binary breaks them on Windows.

License: MIT.

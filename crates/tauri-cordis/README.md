# `tauri-cordis` (Rust crate)

Rust supervisor and JSON-RPC bridge for [`tauri-cordis`](https://github.com/TixXin/tauri-cordis): finds or downloads Node.js, supervises the headless Cordis plugin host (heartbeats, backoff restarts, Job Object / process group containment), serves allowlisted plugin assets over custom protocols, and exposes `#[host_service]` domain functions with `ts-rs` type generation.

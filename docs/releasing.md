# Releasing `tauri-cordis`

All 6 npm packages and 2 Rust crates share aligned release versions and are published via [`.github/workflows/release.yml`](../.github/workflows/release.yml) when pushing a `v<version>` tag (e.g., `v0.1.0`) or triggering Workflow Dispatch.

## 1. Initial Registry Bootstrap (`0.1.0`)

Because npm and crates.io require a package to exist (or an auth token) before OIDC Trusted Publishing can be attached to individual packages:

### Option A: Repository Secrets (automated first publish)
1. Add `NPM_TOKEN` (granular token with publish permission for `tauri-cordis`, `@tauri-cordis/*` — create the `tauri-cordis` org on npmjs.com first — and `create-tauri-cordis-plugin`) and `CARGO_REGISTRY_TOKEN` in `TixXin/tauri-cordis` → **Settings → Secrets and variables → Actions**.
2. Push tag `v0.1.0`:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

### Option B: Local one-time bootstrap, then OIDC Trusted Publishing
1. Create the `tauri-cordis` organization on [npmjs.com](https://www.npmjs.com), then run locally after `npm login` and `cargo login`:
   ```bash
   mkdir -p .tmp/tarballs
   for dir in packages/manifest packages/market packages/review packages/tauri-cordis packages/cli packages/create-plugin; do
     tarball=$(pnpm --dir "$dir" pack --pack-destination "$(pwd)/.tmp/tarballs" | tail -n 1)
     npm publish "$tarball" --access public
   done
   cargo publish -p tauri-cordis-macros
   cargo publish -p tauri-cordis
   ```
2. On npmjs.com (each package → **Settings → Trusted Publisher**) and crates.io (each crate → **Settings → Trusted Publishing**), bind:
   - Owner: `TixXin`
   - Repository: `tauri-cordis`
   - Workflow: `release.yml`
   - Environment: `npm` (for npmjs.com) / `crates` (for crates.io)
3. Subsequent `v*` tags publish with OIDC provenance and zero stored tokens.

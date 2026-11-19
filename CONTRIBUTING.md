# Contributing

Issues, questions and pull requests are welcome.

- **A bug or a missing piece**: open an [issue](https://github.com/TixXin/tauri-cordis/issues/new/choose).
- **A question, or how to do something**: start a [discussion](https://github.com/TixXin/tauri-cordis/discussions).
- **A security problem**: do not open an issue; see [SECURITY.md](./SECURITY.md).

## Set up

You need Node 22.15 or newer, pnpm 11, and a stable Rust toolchain.

```bash
git clone https://github.com/TixXin/tauri-cordis
cd tauri-cordis
pnpm install
pnpm check          # types, JavaScript tests, package contents
cargo test --workspace
```

CI runs the same commands on Windows, macOS and Linux.

## Layout

```text
packages/tauri-cordis     plugin API, Node host, window client, slots, services
packages/manifest         manifest validation, packages, signatures
packages/market           signed index, revocation, version selection
packages/review           version-to-version review
packages/cli              the tauri-cordis-plugin command
packages/create-plugin    project scaffolder
crates/tauri-cordis       supervisor, Node finder and downloader, JSON-RPC, method serving
crates/tauri-cordis-macros  #[host_service]
examples/tauri-app        a small Tauri app that uses all of it
docs/                     concepts, guides, guarantees
```

## Rules for a change

1. **A behavior the runtime promises needs a test.** If you add or change a promise, change the test and the row in [docs/guarantees.md](./docs/guarantees.md) in the same commit. If you fix a bug, add the test that would have caught it.
2. **Nothing app-specific in the base.** `packages/*/test/boundary.test.mjs` fails if a package imports something outside its allowed set. The base must not learn about any one app's features.
3. **Published interfaces only grow.** A versioned name (`notes/v1`, `main.panel/v1`, a manifest field, a wire message) keeps its shape. A breaking change is a new name, or goes in the changelog under "Breaking" for the next minor release. See [docs/stability.md](./docs/stability.md).
4. **Keep the vendored Cordis as it is.** If you must patch it, add a row to [`vendor/README.md`](./packages/tauri-cordis/vendor/README.md) saying what and why.
5. **Update the docs you made untrue**, and add a line to [CHANGELOG.md](./CHANGELOG.md) under "Unreleased".

Commit messages are in English, in the form `type(scope): what changed`, for example `fix(host): keep the restart backoff after a failed ready`.

## Where the code comes from

The runtime is developed inside [Fuyu's repository](https://github.com/TixXin/fuyu) (`packages/plugin-*` and `src-tauri/crates/plugin-base*`) and published from this one. For now the two are synced by hand ([TixXin/fuyu#1040](https://github.com/TixXin/fuyu/issues/1040) tracks making it mechanical).

What that means for you:

- Open pull requests **here**. You do not need to know Fuyu's repository.
- A maintainer ports an accepted change to Fuyu as well, so a merge may take a little longer than the review.
- Documentation, examples, CI and release tooling live only here.

## Releases

Maintainers release by pushing a `v<version>` tag; see [docs/releasing.md](./docs/releasing.md).

## License

By contributing you agree that your contribution is licensed under the [MIT License](./LICENSE).

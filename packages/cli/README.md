# @tauri-cordis/cli

The `tauri-cordis-plugin` command: build, check, package, review and sign plugins for apps that use [tauri-cordis](https://github.com/TixXin/tauri-cordis).

```bash
npm install --save-dev @tauri-cordis/cli
```

| Command | What it does |
|---|---|
| `dev` | Builds, registers the plugin in the app's `plugins.yml` as a development plugin, and rebuilds on change (`--data-dir <folder>`) |
| `build` | Writes `build/package/`: manifest, `dist/`, assets |
| `check` | Manifest, a trial build, and the scan a market runs (`--market` for the strict version) |
| `pack` | Builds and writes one package file; the same source gives the same bytes (`--sign` to sign it) |
| `review <old> <new>` | Compares two versions the way a market review does and grades the change green, yellow or red |
| `keygen` | Creates your signing key and prints the public key |
| `sign` | Signs a commit for a market submission, or a package file |

Run `tauri-cordis-plugin help` for every option. A new project from `npm create tauri-cordis-plugin@latest` has these wired to npm scripts.

The same functions are exported for programmatic use (`build`, `pack`, `check`, `review`, and the installer planner an app uses to install a package).

The default signing key location is `~/.tauri-cordis-plugin/signing.key`; see [stability](https://github.com/TixXin/tauri-cordis/blob/main/docs/stability.md#default-names).

Guide: [Writing a plugin](https://github.com/TixXin/tauri-cordis/blob/main/docs/writing-plugins.md). License: MIT.

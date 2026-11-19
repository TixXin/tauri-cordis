# vendor

Third-party code copied into the repository. Anyone who changes a file here adds a row to "Local changes" below.

## cordis

The kernel of the plugin host. These are the build outputs published on npm (`lib/` with JavaScript and type declarations), not the sources, so nothing here needs building. Plugins do not import these packages directly; they import `Context` and `Service` from `tauri-cordis`.

| Folder | npm package | Version | npm integrity |
|---|---|---|---|
| `cordis/core` | `cordis` | 4.0.0-rc.13 | `sha512-rYsquBfrd1U8HuaDr/1TYpdnHiuy5X2oEWJbfEveIZwysfjg3vTXJWKvTPlaPtt2VeFsAJIrzHZnymONyOr3PA==` |
| `cordis/loader` | `@cordisjs/loader` | 1.0.0-rc.10 | `sha512-SdTENuAe1QoK0iORpk4KWuAX/mWvQEnu57XVdF/RMDmMCyMl4Wu3PlFpXy8/Rttzy7O18g0xg2egWJ1yLGOZGA==` |
| `cordis/hmr` | `@cordisjs/hmr` | 2.0.0-rc.0 | `sha512-DlRldaFRvAf5AcFbqaBkswXXgyzywJ739VahkbfAtAlFBIMgluxqOdV2PjMHDPcIZ/f9DTsiIe6ev25wr3ee8Q==` |
| `cordis/include` | `@cordisjs/include` | 2.0.0-rc.0 | `sha512-8R6LCm4AG+PWKZxIvBibT7kYIp4xukKTWDD1oXC1eSf5brB17s5Z1wKKXaq2L1r2VSTxtK3WJ0VB2A9Y52Kgdw==` |
| `cordis/fs` | `@cordisjs/fs` | 2.0.0-rc.0 | `sha512-Te+XWBnMbjOId3PZYCnzgV5KylTSa+MB1FP9pMYV8UEwXOd3GAX5QrDCulGcoiyrGfWC/QZK0Hn68FVR7IJ3bw==` |
| `cordis/fs-node` | `@cordisjs/fs-node` | 0.1.0 | `sha512-+RjwvBl/qe2L+fnY7PlHbETuyxI663bzTINyQ9V6nj1aCuCiGjldwyDTmVd82m628EUT99PjHGCadLHZEVPMeQ==` |

- Upstream: [cordiverse/cordis](https://github.com/cordiverse/cordis). All six packages were published from commit `bc9fae7a92de7f74417e54eaf3decdecf71f937a` (2026-11-12, `chore: bump versions (#322)`).
- License: MIT. `LICENSE` is the text from that upstream commit (the npm packages do not carry it, so it was taken from the repository), and each package folder has its own copy.
- Their own dependencies (`cosmokit`, `yaml`, `schemastery`, `chokidar` and others) are installed from npm as usual and pinned by `pnpm-lock.yaml`.

### Local changes

| File | What changed | Why |
|---|---|---|
| `cordis/loader/lib/index.js` | The `new Function` used to evaluate expressions in configuration is created on first use instead of at module load (6 lines). | With the host started under `--disallow-code-generation-from-strings`, the original made the whole loader fail to import. With the change, configuration cannot contain expressions; everything else works as before. |
| `cordis/core/lib/index.js` | `emit` calls each listener in its own `try`/`catch`. A listener that throws is logged against the plugin that owns it, later listeners for the same event still run, and the error is not thrown to the emitter. Kernel events starting with `internal/` still throw. | A notification must not fail to reach other plugins because one plugin threw (guarantee 20, `test/guarantees-errors.test.mjs`). `parallel`, `serial`, `bail` and `waterfall` are unchanged: their callers want the result and should see the error. |
| `cordis/core/package.json`, `cordis/core/bin.js` | `bin` and the `bin.js` it points to are removed. | That is Cordis's own command-line entry. It is not used here, and leaving it would make pnpm install a `cordis` command. |

### Upgrading

Download the new versions from npm (`npm pack <package>@<version>`), check the integrity, replace each folder as a whole, apply the local changes above again, and update the table. Run `pnpm test` before and after: the guarantee tests in `packages/tauri-cordis/test/` are there to catch a change in Cordis's behavior.

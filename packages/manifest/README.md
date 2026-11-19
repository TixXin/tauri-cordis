# @tauri-cordis/manifest

The plugin manifest and package format of [tauri-cordis](https://github.com/TixXin/tauri-cordis). No dependencies on the runtime: use it in an app, a market's CI, or a script.

```bash
npm install @tauri-cordis/manifest
```

- **`validateManifest(pkg, options)`** checks a plugin's `package.json` and returns errors and warnings with a path and a code each.
- **`packDirectory(dir, options)`** and **`readPackage(zip, options)`** write and read a package. Packing is deterministic: the same files give the same bytes and the same digest. Reading enforces size and file-count limits and refuses paths that leave the package.
- **`signPackage`**, **`verifyPackage`**, **`generateSigningKey`** add and check Ed25519 signatures by role (author, market).
- **`checkPluginName`** and the naming rules for plugins and services; the rules alone are also at `@tauri-cordis/manifest/names`.

```js
import { validateManifest } from "@tauri-cordis/manifest";

const result = validateManifest(pkg, { stage: "source", appVersion: "1.4.0" });
if (!result.ok) console.error(result.errors);
```

Docs: [manifest fields](https://github.com/TixXin/tauri-cordis/blob/main/docs/writing-plugins.md#the-manifest), [security model](https://github.com/TixXin/tauri-cordis/blob/main/docs/security.md). License: MIT.

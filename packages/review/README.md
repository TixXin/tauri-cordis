# @tauri-cordis/review

Compares two versions of a plugin and says what changed and how risky it looks. Part of [tauri-cordis](https://github.com/TixXin/tauri-cordis); usable on its own in a market's CI.

```bash
npm install @tauri-cordis/review
```

It looks at source and at the built bundle and reports findings by check:

| Check | Looks for |
|---|---|
| `manifest` | Declared services, slots, commands and windows that were added or removed; experimental interfaces (red) |
| `nodeApis` | Node built-in modules the code newly uses, or uses without declaring |
| `network` | Newly declared hosts, and hosts that appear in the code |
| `dependencies` | Added, removed and changed packages; a package whose hash or download address changed under the same version; install scripts; dependencies without a lockfile |
| `sensitive` | `child_process`, `vm`, `eval` and `new Function`, native bindings, `import()` or `require()` with a computed name, paths in the home or temp folder |
| `obfuscation` | Obfuscator-style names, strings built from character codes, dense escapes, very long lines, large hex or base64 blocks, high-entropy strings |
| `files` | Native add-ons and executables (red); new or changed scripts and binaries; symbolic links |
| `size` | A source change larger than a threshold |

The result is a report with a tier: **green** (nothing to look at), **yellow** (a person should read the findings), **red** (do not publish as is). The tool grades; a reviewer decides.

In 0.2 the finding messages are written in Chinese; `check`, `kind` and `tier` are stable identifiers you can map to your own text.

From the command line it is `tauri-cordis-plugin review <old> <new>` in `@tauri-cordis/cli`.

Docs: [security model](https://github.com/TixXin/tauri-cordis/blob/main/docs/security.md). License: MIT.

# create-tauri-cordis-plugin

Scaffolds a TypeScript and React plugin project for an app that uses [tauri-cordis](https://github.com/TixXin/tauri-cordis).

```bash
npm create tauri-cordis-plugin@latest my-plugin -- --scope your-github-name
cd my-plugin
npm install
npm run dev -- --data-dir <the app's plugin data folder>
```

| Option | Default | Meaning |
|---|---|---|
| `--scope <owner>` | `demo` | The npm scope, which is the publisher |
| `--name <name>` | the folder name | The plugin's name |
| `--window <name>` | `main` | The window the UI part is for |
| `--slot <name>` | `<window>.panel/v1` | The slot it puts a component into |

The project has a host part (`src/host.ts`), a window part (`src/<window>.tsx`), a manifest in `package.json`, and npm scripts for `dev`, `build`, `check` and `pack`.

Guide: [Writing a plugin](https://github.com/TixXin/tauri-cordis/blob/main/docs/writing-plugins.md). License: MIT.

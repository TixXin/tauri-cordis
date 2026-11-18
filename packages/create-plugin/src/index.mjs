import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { checkPluginName } from "@tauri-cordis/manifest";

const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>\n';

export function projectFiles(options) {
  const scope = String(options.scope ?? "example").replace(/^@/, "").toLowerCase();
  const name = String(options.name ?? "hello-plugin").toLowerCase();
  const appKey = options.appKey ?? "fuyu";
  const windowName = options.windowName ?? "main";
  const slot = options.slot ?? `${windowName}.panel/v1`;
  const packageName = `@${scope}/${name}`;
  const repository = `github:${scope}/${name}`;
  const problem = checkPluginName(packageName, repository, { officialScope: appKey });
  if (problem) throw new Error(`Invalid plugin name ${packageName}: ${problem.message}`);

  const displayName = options.displayName ?? { "zh-CN": name, en: name };
  const description = options.description ?? { "zh-CN": `${name} 插件`, en: `${name} plugin` };

  const pkg = {
    name: packageName,
    version: "0.1.0",
    type: "module",
    description: description.en,
    license: "MIT",
    repository,
    engines: { [appKey]: ">=0.1.0" },
    scripts: {
      dev: "tauri-cordis-plugin dev",
      build: "tauri-cordis-plugin build",
      check: "tauri-cordis-plugin check",
      pack: "tauri-cordis-plugin pack",
      typecheck: "tsc --noEmit",
    },
    devDependencies: {
      "@tauri-cordis/cli": "^0.1.0",
      "@types/react": "^19.1.8",
      react: "^19.1.0",
      "tauri-cordis": "^0.1.0",
      typescript: "~5.8.3",
    },
    [appKey]: {
      manifest: 1,
      displayName,
      description,
      icon: "assets/icon.svg",
      categories: ["utilities"],
      host: "dist/host.js",
      client: { [windowName]: `dist/${windowName}.js` },
      slots: [slot],
    },
  };

  return {
    "package.json": `${JSON.stringify(pkg, null, 2)}\n`,
    "tsconfig.json": `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM"],
          module: "ESNext",
          moduleResolution: "Bundler",
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
        },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
    ".gitignore": "node_modules/\ndist/\nbuild/\n",
    "assets/icon.svg": ICON_SVG,
    "src/host.ts": [
      'import type { Context } from "tauri-cordis";',
      "",
      "export const name = " + JSON.stringify(name) + ";",
      "",
      "export default function apply(ctx: Context) {",
      "  let ticks = 0;",
      '  ctx.clients.handle("ping", () => ({ ticks }));',
      "  ctx.setInterval(() => {",
      "    ticks += 1;",
      '    ctx.clients.publish("tick", { ticks });',
      "  }, 1000);",
      "}",
      "",
    ].join("\n"),
    [`src/${windowName}.tsx`]: [
      'import { useEffect, useState } from "react";',
      'import type { Context } from "tauri-cordis";',
      'import "./styles.css";',
      "",
      "function Panel({ ctx }: { ctx: Context }) {",
      "  const [ticks, setTicks] = useState(0);",
      "  useEffect(() => {",
      '    void ctx.host.call<{ ticks: number }>("ping").then((res) => setTicks(res.ticks));',
      '    const off = ctx.host.on("tick", (payload: { ticks: number }) => setTicks(payload.ticks));',
      "    return () => { void off(); };",
      "  }, [ctx]);",
      '  return <div className="tc-plugin-card">Ticks: {ticks}</div>;',
      "}",
      "",
      "export default function apply(ctx: Context) {",
      `  ctx.slots.add(${JSON.stringify(slot)} as never, {`,
      `    id: ${JSON.stringify(`${packageName}:panel`)},`,
      "    component: () => <Panel ctx={ctx} />,",
      "  });",
      "}",
      "",
    ].join("\n"),
    "src/styles.css": ".tc-plugin-card { padding: 8px 12px; border-radius: 8px; }\n",
    "README.md": `# ${packageName}\n\nA plugin built with [tauri-cordis](https://github.com/TixXin/tauri-cordis).\n`,
  };
}

export function scaffoldPlugin(options) {
  const dir = resolve(options.dir);
  if (existsSync(dir) && readdirSync(dir).length > 0) {
    throw new Error(`Target directory is not empty: ${dir}`);
  }
  const files = projectFiles(options);
  for (const [rel, content] of Object.entries(files)) {
    const target = join(dir, rel);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content, "utf8");
  }
  const pkg = JSON.parse(files["package.json"]);
  return { packageName: pkg.name, dir, files: Object.keys(files).sort() };
}

export async function runCli(argv, cwd = process.cwd()) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      scope: { type: "string", default: "demo" },
      name: { type: "string" },
      "app-key": { type: "string", default: "fuyu" },
      window: { type: "string", default: "main" },
      slot: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help || positionals.length === 0) {
    process.stdout.write("Usage: create-tauri-cordis-plugin <folder> [--scope <owner>] [--name <plugin-name>] [--app-key <key>]\n");
    return values.help ? 0 : 1;
  }
  const dir = resolve(cwd, positionals[0]);
  const name = values.name ?? basename(dir);
  const result = scaffoldPlugin({
    dir,
    scope: values.scope,
    name,
    appKey: values["app-key"],
    windowName: values.window,
    slot: values.slot,
  });
  process.stdout.write(`Created ${result.packageName} in ${result.dir}\n`);
  return 0;
}

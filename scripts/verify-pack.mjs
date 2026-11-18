import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PACKAGES = [
  "packages/manifest",
  "packages/market",
  "packages/review",
  "packages/tauri-cordis",
  "packages/cli",
  "packages/create-plugin",
];

const temp = mkdtempSync(join(tmpdir(), "tauri-cordis-pack-"));
try {
  for (const rel of PACKAGES) {
    const cwd = join(ROOT, rel);
    const out = execFileSync("pnpm", ["pack", "--pack-destination", temp], { cwd, encoding: "utf8" }).trim();
    const tarball = out.split("\n").pop().trim();
    const extractDir = mkdtempSync(join(temp, "unz-"));
    execFileSync("tar", ["-xzf", tarball, "-C", extractDir]);
    const packedPkg = JSON.parse(readFileSync(join(extractDir, "package/package.json"), "utf8"));
    const raw = JSON.stringify(packedPkg);
    assert.ok(!raw.includes("workspace:"), `${packedPkg.name} tarball still contains workspace: protocol`);
    assert.equal(packedPkg.private, undefined, `${packedPkg.name} must not be private`);
    assert.equal(packedPkg.license, "MIT");
    console.log(`[pack ok] ${packedPkg.name}@${packedPkg.version} -> ${tarball.split("/").pop()}`);
  }

  for (const crate of ["tauri-cordis-macros", "tauri-cordis"]) {
    const list = execFileSync("cargo", ["package", "-p", crate, "--list", "--allow-dirty"], { cwd: ROOT, encoding: "utf8" });
    assert.ok(list.includes("Cargo.toml") && list.includes("LICENSE"), `${crate} package list missing Cargo.toml or LICENSE`);
    console.log(`[cargo package --list ok] ${crate} (${list.trim().split("\n").length} files)`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

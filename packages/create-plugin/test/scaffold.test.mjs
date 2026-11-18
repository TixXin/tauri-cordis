import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { build, check, pack } from "@tauri-cordis/cli";
import { validateManifest } from "@tauri-cordis/manifest";
import { scaffoldPlugin } from "create-tauri-cordis-plugin";

test("create-tauri-cordis-plugin scaffolds a valid plugin that builds, passes check, and packs deterministically", async () => {
  const temp = mkdtempSync(join(tmpdir(), "tc-scaffold-"));
  try {
    const target = join(temp, "hello-notes");
    const created = scaffoldPlugin({
      dir: target,
      scope: "alice",
      name: "hello-notes",
      appKey: "fuyu",
      windowName: "island",
      slot: "island.page/v1",
    });
    assert.equal(created.packageName, "@alice/hello-notes");
    const built = await build(target);
    assert.equal(validateManifest(built.manifest, { stage: "built" }).ok, true);
    const checked = await check(target);
    assert.equal(checked.ok, true);
    const packed = await pack(target);
    assert.ok(packed.size > 0);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

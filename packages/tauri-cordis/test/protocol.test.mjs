import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { SHARED_MODULES } from "tauri-cordis/protocol";

const shimsDir = fileURLToPath(new URL("../src/client/shims/", import.meta.url));

test("SHARED_MODULES names react and react/jsx-runtime", () => {
  assert.deepEqual(Object.keys(SHARED_MODULES).sort(), ["react", "react/jsx-runtime"]);
});

test("every shared module path is a non-empty ESM shim file under __shared/", () => {
  const files = readdirSync(shimsDir).sort();
  const paths = Object.values(SHARED_MODULES);
  for (const path of paths) assert.match(path, /^__shared\/[a-z0-9-]+\.js$/);
  assert.deepEqual(paths.map((path) => path.slice("__shared/".length)).sort(), files);
  for (const file of files) {
    const content = readFileSync(join(shimsDir, file), "utf8");
    assert.match(content, /export\s/);
  }
});

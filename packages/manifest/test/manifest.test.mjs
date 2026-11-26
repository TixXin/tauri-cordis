import assert from "node:assert/strict";
import { test } from "node:test";
import { manifestSchema, parseRepository, validateManifest } from "@tauri-cordis/manifest";
import { samplePackage, withApp } from "./fixtures.mjs";

const codes = (result) => result.errors.map((issue) => `${issue.path}:${issue.code}`);
const warningCodes = (result) => result.warnings.map((issue) => `${issue.path}:${issue.code}`);
const fails = (pkg, expected, options) => {
  const result = validateManifest(pkg, options);
  assert.equal(result.ok, false, `expected ${expected} to fail`);
  assert.ok(codes(result).includes(expected), `${expected} not in ${codes(result).join(", ")}`);
  assert.equal(result.manifest, null);
};

test("the full example from the design passes without warnings", () => {
  const result = validateManifest(samplePackage());
  assert.deepEqual(codes(result), []);
  assert.deepEqual(warningCodes(result), []);
});

test("npm fields: required, type module, semver version, license and repository", () => {
  for (const key of ["name", "version", "license", "repository"]) {
    const pkg = samplePackage();
    delete pkg[key];
    fails(pkg, `${key}:required`);
  }
  fails({ ...samplePackage(), type: "commonjs" }, "type:module");
  fails({ ...samplePackage(), version: "1.2" }, "version:semver");
  fails({ ...samplePackage(), version: "v1.2.0" }, "version:semver");
  fails({ ...samplePackage(), license: "UNLICENSED" }, "license:license");
  fails({ ...samplePackage(), repository: "not a repo" }, "repository:repository");
  assert.equal(validateManifest({ ...samplePackage(), version: "1.2.0-beta.1" }).ok, true);
});

test("engines.cordis is required, must be a range and can be checked against the app version", () => {
  fails({ ...samplePackage(), engines: {} }, "engines.cordis:required");
  fails({ ...samplePackage(), engines: { cordis: "soon" } }, "engines.cordis:range");
  fails(samplePackage(), "engines.cordis:engine", { appVersion: "0.3.9" });
  assert.equal(validateManifest(samplePackage(), { appVersion: "0.5.0" }).ok, true);
});

test("a beta app build is compared by its ordering, so a newer beta fits an older range", () => {
  const needs0310 = { ...samplePackage(), engines: { cordis: ">=0.3.10" } };
  assert.equal(validateManifest(needs0310, { appVersion: "0.3.11-beta.4" }).ok, true);
  fails(needs0310, "engines.cordis:engine", { appVersion: "0.3.10-beta.1" });
  fails({ ...samplePackage(), engines: { cordis: ">=0.3.11" } }, "engines.cordis:engine", { appVersion: "0.3.11-beta.4" });
});

test("third-party names are @<repository owner>/<name>, compared without case", () => {
  fails({ ...samplePackage(), name: "cordis-weather" }, "name:name-unscoped");
  fails({ ...samplePackage(), name: "@other/weather" }, "name:name-owner");
  fails({ ...samplePackage(), name: "@Someone/weather" }, "name:name");
  assert.equal(validateManifest({ ...samplePackage(), repository: "https://github.com/SomeOne/cordis-weather.git" }).ok, true);
  assert.equal(validateManifest({ ...samplePackage(), repository: { type: "git", url: "git+https://github.com/someone/x.git" } }).ok, true);
  assert.equal(validateManifest({ ...samplePackage(), name: "@someone/weather" }).ok, true);
});

test("@cordis/* is reserved for official plugins; the scope is configurable", () => {
  const official = { ...samplePackage(), name: "@cordis/weather", repository: "github:TixXin/tauri-cordis" };
  fails(official, "name:name-reserved");
  fails({ ...official, name: "@CORDIS/weather" }, "name:name");
  assert.equal(validateManifest(official, { official: true }).ok, true);
  assert.equal(validateManifest({ ...official, name: "@atoll/weather" }, { official: true, officialScope: "atoll" }).ok, true);
  fails({ ...official, name: "@atoll/weather" }, "name:name-reserved", { officialScope: "atoll" });
});

test("the app section: required fields and locales", () => {
  for (const key of ["displayName", "description", "icon", "categories"]) fails(withApp((app) => delete app[key]), `cordis.${key}:required`);
  fails(withApp((app) => (app.manifest = 2)), "cordis.manifest:manifest");
  fails(withApp((app) => (app.displayName = { en: "Weather" })), "cordis.displayName.zh-CN:required");
  fails(withApp((app) => (app.displayName = "Weather")), "cordis.displayName:localized");
  fails(withApp((app) => (app.icon = "assets/icon.gif")), "cordis.icon:path");
  fails(withApp((app) => (app.categories = ["games"])), "cordis.categories[0]:type");
  fails(withApp((app) => (app.categories = [])), "cordis.categories:required");
  assert.equal(validateManifest(withApp((app) => (app.categories = ["games"])), { categories: ["games"] }).ok, true);
});

test("the app section: entries are relative paths inside the package", () => {
  for (const bad of ["../host.js", "/abs/host.js", "dist\\host.js", "C:/host.js", "dist//host.js", "./dist/host.js"]) {
    fails(withApp((app) => (app.host = bad)), "cordis.host:path");
  }
  fails(withApp((app) => (app.client = { island: "../x.js" })), "cordis.client.island:path");
  fails(withApp((app) => (app.config = "dist/config.yaml")), "cordis.config:path");
});

test("the app section: lists, requires, commands, screenshots, network, platforms", () => {
  fails(withApp((app) => (app.slots = "island.page/v1")), "cordis.slots:type");
  fails(withApp((app) => (app.requires = { weather: "^1" })), "requires.weather:name");
  fails(withApp((app) => (app.requires = { "@cordis/location": "latest" })), "requires.@cordis/location:range");
  fails(withApp((app) => app.commands.push({ ...app.commands[0] })), "cordis.commands[1].id:duplicate");
  fails(withApp((app) => (app.commands = [{ id: "x" }])), "cordis.commands[0].title:required");
  fails(withApp((app) => (app.screenshots = Array.from({ length: 7 }, () => ({ path: "a.png" })))), "cordis.screenshots:too-many");
  fails(withApp((app) => (app.network = ["https://api.example.com"])), "cordis.network[0]:type");
  fails(withApp((app) => (app.platforms = ["android"])), "cordis.platforms[0]:type");
  fails(withApp((app) => (app.preview = "yes")), "cordis.preview:type");
  assert.equal(validateManifest(withApp((app) => (app.network = ["*.example.com", "localhost"]))).ok, true);
});

test("experimental interfaces are refused when the caller says so", () => {
  const pkg = withApp((app) => (app.experimental = ["island.page/v2"]));
  assert.equal(validateManifest(pkg).ok, true);
  fails(pkg, "cordis.experimental:experimental", { allowExperimental: false });
});

test("nodeApis and builtWith written by hand in the source give warnings", () => {
  const source = validateManifest(samplePackage(), { stage: "source" });
  assert.equal(source.ok, true);
  assert.deepEqual(warningCodes(source), ["cordis.nodeApis:generated", "cordis.builtWith:generated"]);
  fails(withApp((app) => (app.builtWith = "latest")), "cordis.builtWith:semver");
});

test("unknown fields give warnings, not errors", () => {
  const pkg = withApp((app, root) => {
    app.theme = "dark";
    app.commands[0].when = "always";
    root.island = true;
    root.scripts = { build: "x" };
  });
  const result = validateManifest(pkg);
  assert.equal(result.ok, true);
  assert.deepEqual(warningCodes(result), ["island:unknown", "cordis.commands[0].when:unknown", "cordis.theme:unknown"]);
});

test("a configured app key moves both the section and engines", () => {
  assert.equal(validateManifest(samplePackage("atoll"), { appKey: "atoll" }).ok, true);
  fails(samplePackage("atoll"), "cordis:required");
});

test("parseRepository reads the usual repository spellings", () => {
  const owner = (value) => parseRepository(value)?.owner ?? null;
  assert.equal(owner("someone/repo"), "someone");
  assert.equal(owner("github:someone/repo"), "someone");
  assert.equal(owner("gitlab:group/repo"), "group");
  assert.equal(owner("git@github.com:someone/repo.git"), "someone");
  assert.equal(owner("https://github.com/someone/repo"), "someone");
  assert.equal(owner({ url: "git+ssh://git@github.com/someone/repo.git" }), "someone");
  assert.equal(owner("file:///tmp/repo"), null);
  assert.equal(owner(""), null);
});

test("the JSON Schema lists the required fields under the configured key", () => {
  const schema = manifestSchema({ appKey: "atoll" });
  assert.ok(schema.required.includes("atoll"));
  assert.deepEqual(schema.properties.engines.required, ["atoll"]);
  assert.deepEqual(schema.properties.atoll.required, ["manifest", "displayName", "description", "icon", "categories"]);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(manifestSchema())));
  const pathPattern = new RegExp(schema.properties.atoll.properties.host.pattern);
  assert.equal(pathPattern.test("dist/host.js"), true);
  for (const bad of ["../x.js", "/x.js", "a/./b.js", "a\\b.js"]) assert.equal(pathPattern.test(bad), false, bad);
});

/**
 * Release zip: dist/eternia.zip with what Foundry needs (the manifests, the docs, lang, module, css, templates,
 * assets and the compiled packs), plus a copy of its system.json next to it. The zip loads the bundles of
 * tools/bundle.mjs (the code with the templates in one file, the stylesheets in one file per layer): its system.json
 * points at them, while the repository's keeps loading the sources.
 *
 *   npm run packs:build      (src/packs -> packs, with the world closed)
 *   node tools/package.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { bundle } from "./bundle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));
const DIST = path.join(ROOT, "dist");
const STAGE = path.join(DIST, manifest.id);
const FILES = ["system.json", "template.json", "README.md", "CHANGELOG.md", "LICENSE.txt", "lang", "module", "css",
  "templates", "assets", "packs"];

// The download URL must point at this version's release.
if (!manifest.download?.includes(`/v${manifest.version}/`)) {
  throw new Error(`system.json "download" doesn't point at v${manifest.version}`);
}
// Every compendium of the manifest, compiled.
for (const pack of manifest.packs) {
  if (!fs.existsSync(path.join(ROOT, pack.path, "CURRENT"))) throw new Error(`${pack.path} is not built: npm run packs:build`);
}

fs.rmSync(DIST, { recursive: true, force: true });
for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) throw new Error(`Missing ${f}`);
  // Foundry's lock file of an open pack never ships.
  fs.cpSync(src, path.join(STAGE, f), { recursive: true, filter: file => path.basename(file) !== "LOCK" });
}
const built = await bundle(STAGE);
console.log(`${built.manifest.esmodules[0]}: ${built.inputs} modules + ${built.templates} templates, `
  + `${(built.size / 1024).toFixed(0)} KB; ${built.styles} stylesheets -> ${built.manifest.styles.length}`);
const zip = path.join(DIST, `${manifest.id}.zip`);
// The Windows tar (bsdtar), not a GNU tar from Git/MSYS that reads "C:" as a remote host;
// tar -a picks the zip format from the extension.
const tar = (process.platform === "win32") ? path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar";
execFileSync(tar, ["-a", "-c", "-f", path.relative(STAGE, zip), ...FILES], { cwd: STAGE, stdio: "inherit" });
fs.copyFileSync(path.join(STAGE, "system.json"), path.join(DIST, "system.json"));
fs.rmSync(STAGE, { recursive: true, force: true });
const size = fs.statSync(zip).size;
console.log(`${path.relative(ROOT, zip)}: ${(size / 1024 / 1024).toFixed(1)} MB (${manifest.id} ${manifest.version})`);

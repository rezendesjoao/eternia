/**
 * The release build: the code, the styles and the templates of the system in a few files.
 *
 * Foundry's server answers every file with "Cache-Control: no-cache" over HTTP/1.1 (six requests at a time), so each
 * file the browser loads costs at least one round trip to the server on every visit, even unchanged. Unbundled, the
 * system is ~250 code files, 22 stylesheets and ~135 templates: against a remote server that's seconds before the
 * world even starts. The build writes, into a staged copy of the system:
 *   - module/eternia.bundle.mjs: every module of module/ in one file (esbuild, scope-hoisted ESM, whitespace removed,
 *     names kept), with every template of templates/ inside (helpers/template-bundle.mjs), and its source map;
 *   - css/eternia.bundle.<layer>.css: the stylesheets of each layer joined in the manifest's order (same cascade);
 *   - system.json pointing at them.
 * The repository keeps loading the sources (module/eternia.mjs and each stylesheet), as before.
 *
 *   node tools/bundle.mjs <stageDir>     (tools/package.mjs runs it on the release stage)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const BUNDLE = "module/eternia.bundle.mjs";

/** Every template of templates/, by the path the code asks for ("systems/eternia/templates/…"). */
function readTemplates(id) {
  const out = {};
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(hbs|html)$/.test(entry.name)) {
        out[`systems/${id}/${path.relative(ROOT, file).split(path.sep).join("/")}`] = fs.readFileSync(file, "utf8");
      }
    }
  };
  walk(path.join(ROOT, "templates"));
  return out;
}

/** Bundle the code into <stage>/module/eternia.bundle.mjs. */
async function bundleCode(stage, manifest) {
  const templates = readTemplates(manifest.id);
  const stub = path.join(ROOT, "module", "helpers", "template-bundle.mjs");
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, manifest.esmodules[0])],
    // Built as if it sat next to the sources, so the source map names them as they are served (helpers/…)
    outfile: path.join(ROOT, BUNDLE),
    write: false,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "esnext",
    charset: "utf8",
    // Whitespace and comments only, and every name kept: Foundry keys a sheet ("eternia.EterniaItemSheet") and the render
    // hooks by the class's name, and a module the code imports lazily (import()) is wrapped, its classes made
    // "X = class _X": keepNames gives each one its own name back, as a renamed top-level one (two modules sharing it)
    minifyWhitespace: true,
    keepNames: true,
    legalComments: "none",
    sourcemap: "linked",
    sourcesContent: true,
    logLevel: "warning",
    metafile: true,
    plugins: [{
      name: "eternia-templates",
      setup(build) {
        build.onLoad({ filter: /template-bundle\.mjs$/ }, args => {
          if (path.resolve(args.path) !== stub) return undefined;
          return { contents: `export default ${JSON.stringify(templates)};\n`, loader: "js" };
        });
      }
    }]
  });
  for (const file of result.outputFiles) {
    const out = path.join(stage, path.relative(ROOT, file.path));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, file.contents);
  }
  const inputs = Object.keys(result.metafile.inputs).length;
  const size = fs.statSync(path.join(stage, BUNDLE)).size;
  return { inputs, templates: Object.keys(templates).length, size };
}

/** Join the stylesheets of each layer, in the manifest's order, into <stage>/css/eternia.bundle.<layer>.css. */
function bundleStyles(stage, manifest) {
  const layers = new Map();
  for (const style of manifest.styles) {
    const layer = style.layer ?? "system";
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer).push(style.src);
  }
  const styles = [];
  for (const [layer, files] of layers) {
    const parts = files.map(src => {
      const css = fs.readFileSync(path.join(ROOT, src), "utf8").replace(/^﻿/, "");
      // A joined file can't hold these mid-way; none of the system's stylesheets uses them
      if (/^\s*@(import|charset|namespace)\b/m.test(css)) throw new Error(`${src}: @import/@charset/@namespace can't be bundled`);
      return `/* ${src} */\n${css}\n`;
    });
    const src = `css/eternia.bundle.${layer}.css`;
    // Every source lives in css/, like the bundle, so their url(…) stay valid
    if (files.some(f => path.dirname(f) !== "css")) throw new Error(`Stylesheets outside css/ can't be bundled: ${files}`);
    fs.mkdirSync(path.join(stage, "css"), { recursive: true });
    fs.writeFileSync(path.join(stage, src), parts.join(""));
    styles.push(layer === "system" ? { src } : { src, layer });
  }
  return styles;
}

/** Build the bundles into a staged copy of the system and point its system.json at them. */
export async function bundle(stage) {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));
  if (manifest.esmodules?.length !== 1) throw new Error("system.json must have one esmodule entry point");
  const code = await bundleCode(stage, manifest);
  const styles = bundleStyles(stage, manifest);
  const staged = { ...manifest, esmodules: [BUNDLE], styles };
  fs.writeFileSync(path.join(stage, "system.json"), `${JSON.stringify(staged, null, 2)}\n`);
  return { ...code, styles: manifest.styles.length, manifest: staged };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const stage = path.resolve(process.argv[2] ?? "");
  if (!process.argv[2] || !fs.existsSync(stage)) throw new Error("Usage: node tools/bundle.mjs <stageDir>");
  const r = await bundle(stage);
  console.log(`${BUNDLE}: ${r.inputs} modules + ${r.templates} templates, ${(r.size / 1024).toFixed(0)} KB; `
    + `${r.styles} stylesheets -> ${r.manifest.styles.length}`);
}

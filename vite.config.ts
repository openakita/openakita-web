import { createHash } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { build as buildWithEsbuild } from "esbuild";
import { defineConfig, type Plugin } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const ignoredDirectories = new Set([".git", ".idea", ".vite", "dist", "node_modules"]);
const excludedHtmlFiles = new Set(["memu_reference.html"]);

function filesRecursively(directory: string, accept: (path: string) => boolean): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;

    const path = resolve(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...filesRecursively(path, accept));
    } else if (accept(path)) {
      files.push(path);
    }
  }

  return files.sort();
}

function htmlEntries(): Record<string, string> {
  return Object.fromEntries(
    filesRecursively(projectRoot, (path) => {
      const projectPath = relative(projectRoot, path).split(sep).join("/");
      return path.endsWith(".html") && !excludedHtmlFiles.has(projectPath);
    }).map((path) => {
      const name = relative(projectRoot, path).split(sep).join("/").replace(/\.html$/, "");
      return [name, path];
    }),
  );
}

function contentHash(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 12);
}

function versionRuntimeReferences(outputDirectory: string): void {
  const referencePattern = /(\b(?:href|src)=["'])([^"']*assets\/(?:css|js)\/[^"'?]+\.(?:css|js))(?:\?v=[^"']*)?(["'])/g;

  for (const htmlPath of filesRecursively(outputDirectory, (path) => path.endsWith(".html"))) {
    const before = readFileSync(htmlPath, "utf8");
    const after = before.replace(referencePattern, (match, prefix: string, url: string, suffix: string) => {
      const assetPath = url.startsWith("/")
        ? resolve(outputDirectory, `.${url}`)
        : resolve(dirname(htmlPath), url);
      if (!existsSync(assetPath)) return match;
      return `${prefix}${url}?v=${contentHash(assetPath)}${suffix}`;
    });
    if (after !== before) writeFileSync(htmlPath, after, "utf8");
  }
}

function versionRuntimeLanguagePacks(outputDirectory: string): void {
  const languageDirectory = resolve(outputDirectory, "assets/i18n");
  const mainScript = resolve(outputDirectory, "assets/js/main.js");
  if (!existsSync(languageDirectory) || !existsSync(mainScript)) return;

  const digest = createHash("sha256");
  for (const path of filesRecursively(languageDirectory, (candidate) => candidate.endsWith(".json"))) {
    digest.update(relative(languageDirectory, path));
    digest.update(readFileSync(path));
  }
  const version = digest.digest("hex").slice(0, 12);
  const before = readFileSync(mainScript, "utf8");
  const after = before.replace(/\.json\?v=[^"]+"/, `.json?v=${version}"`);
  if (after !== before) writeFileSync(mainScript, after, "utf8");
}

function finalizeStaticOutput(): Plugin {
  let outputDirectory = resolve(projectRoot, "dist");

  return {
    name: "openakita-finalize-static-output",
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      for (const runtimeDirectory of ["img", "js", "i18n"]) {
        cpSync(
          resolve(projectRoot, "assets", runtimeDirectory),
          resolve(outputDirectory, "assets", runtimeDirectory),
          { recursive: true },
        );
      }
      cpSync(resolve(projectRoot, "api"), resolve(outputDirectory, "api"), { recursive: true });
      copyFileSync(resolve(projectRoot, "CNAME"), resolve(outputDirectory, "CNAME"));

      const motionOutput = resolve(outputDirectory, "assets/js/motion.js");
      mkdirSync(dirname(motionOutput), { recursive: true });
      await buildWithEsbuild({
        entryPoints: [resolve(projectRoot, "assets/ts/motion.ts")],
        outfile: motionOutput,
        bundle: true,
        target: "es2019",
        format: "iife",
        minify: true,
      });

      versionRuntimeLanguagePacks(outputDirectory);
      versionRuntimeReferences(outputDirectory);
    },
  };
}

export default defineConfig({
  plugins: [finalizeStaticOutput()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
  build: {
    assetsDir: "assets/generated",
    rollupOptions: {
      input: htmlEntries(),
    },
  },
});

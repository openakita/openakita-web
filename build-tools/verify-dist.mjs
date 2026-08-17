import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = resolve(projectRoot, "dist");
const ignoredDirectories = new Set([".git", ".idea", ".vite", "dist", "node_modules"]);
const excludedHtmlFiles = new Set(["memu_reference.html"]);

function filesRecursively(directory, accept, ignored = new Set()) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    if (ignored.has(entry)) continue;
    const path = resolve(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) files.push(...filesRecursively(path, accept, ignored));
    else if (accept(path)) files.push(path);
  }
  return files.sort();
}

function displayPath(path) {
  return relative(projectRoot, path).split(sep).join("/");
}

function existsWithExactCase(path) {
  if (!existsSync(path)) return false;
  const projectPath = relative(outputDirectory, path);
  if (projectPath === "" || projectPath === ".") return true;
  if (projectPath === ".." || projectPath.startsWith(`..${sep}`) || isAbsolute(projectPath)) return false;

  let current = outputDirectory;
  for (const part of projectPath.split(sep)) {
    if (!readdirSync(current).includes(part)) return false;
    current = resolve(current, part);
  }
  return true;
}

function localReferencePath(htmlPath, value) {
  const withoutFragment = value.split("#", 1)[0].split("?", 1)[0];
  if (!withoutFragment || withoutFragment.startsWith("//")) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(withoutFragment)) return undefined;

  let decoded = withoutFragment;
  try {
    decoded = decodeURI(withoutFragment);
  } catch {
    return "__invalid_uri__";
  }

  const target = decoded.startsWith("/")
    ? resolve(outputDirectory, `.${decoded}`)
    : resolve(dirname(htmlPath), decoded);
  const resolvedTarget = decoded.endsWith("/") ? resolve(target, "index.html") : target;
  const outputPath = relative(outputDirectory, resolvedTarget);
  if (outputPath === ".." || outputPath.startsWith(`..${sep}`) || isAbsolute(outputPath)) return "__outside_dist__";
  return resolvedTarget;
}

function fail(messages) {
  for (const message of messages) console.error(`[verify-dist] ${message}`);
  process.exitCode = 1;
}

if (!existsSync(outputDirectory)) {
  fail(["dist directory does not exist; run npm run build first"]);
} else {
  const failures = [];
  const sourceHtml = filesRecursively(projectRoot, (path) => {
    const projectPath = relative(projectRoot, path).split(sep).join("/");
    return path.endsWith(".html") && !excludedHtmlFiles.has(projectPath);
  }, ignoredDirectories);
  const outputHtml = filesRecursively(outputDirectory, (path) => path.endsWith(".html"));

  for (const sourcePath of sourceHtml) {
    const expected = resolve(outputDirectory, relative(projectRoot, sourcePath));
    if (!existsWithExactCase(expected)) failures.push(`missing page ${displayPath(expected)}`);
  }

  const requiredRuntimeFiles = [
    "CNAME",
    "api/latest-dev.json",
    "assets/js/main.js",
    "assets/js/motion.js",
    "assets/js/tracker.js",
    "assets/js/download.js",
    "assets/i18n/en.json",
    "assets/i18n/ja.json",
    "assets/i18n/ko.json",
    "assets/i18n/ru.json",
    "assets/i18n/fr.json",
    "assets/i18n/de.json",
  ];
  for (const required of requiredRuntimeFiles) {
    if (!existsWithExactCase(resolve(outputDirectory, required))) failures.push(`missing runtime file dist/${required}`);
  }
  if (existsSync(resolve(outputDirectory, "assets/ts"))) {
    failures.push("source TypeScript must not be published under dist/assets/ts");
  }

  const attributePattern = /\b(?:href|src)=["']([^"']+)["']/g;
  for (const htmlPath of outputHtml) {
    const html = readFileSync(htmlPath, "utf8");
    for (const match of html.matchAll(attributePattern)) {
      const target = localReferencePath(htmlPath, match[1]);
      if (target === "__invalid_uri__") {
        failures.push(`invalid URI in ${displayPath(htmlPath)}: ${match[1]}`);
      } else if (target === "__outside_dist__") {
        failures.push(`local reference escapes dist in ${displayPath(htmlPath)}: ${match[1]}`);
      } else if (target && !existsWithExactCase(target)) {
        failures.push(`broken local reference in ${displayPath(htmlPath)}: ${match[1]}`);
      }
    }
  }

  if (outputHtml.length !== sourceHtml.length) {
    failures.push(`HTML page count mismatch: source=${sourceHtml.length}, dist=${outputHtml.length}`);
  }

  if (failures.length > 0) {
    fail(failures);
  } else {
    console.log(`[verify-dist] OK: ${outputHtml.length} pages and ${requiredRuntimeFiles.length} runtime files verified`);
  }
}

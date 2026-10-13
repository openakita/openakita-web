import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = resolve(projectRoot, "dist");
const ignoredDirectories = new Set([".git", ".idea", ".vite", "dist", "node_modules", "partials", "tools-temp", "tools-tmp", "runtime", "openakita"]);
const excludedHtmlFiles = new Set(["memu_reference.html"]);
const headerPlaceholder = '<div data-site-header></div>';
const footerPlaceholder = '<div data-site-footer></div>';
const expectedNavigation = ["home", "download", "chat", "marketplace", "services", "scenarios", "tutorials", "about"];

function filesRecursively(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesRecursively(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files.sort();
}

function projectPath(path) {
  return relative(projectRoot, path).split(sep).join("/");
}

function occurrences(text, pattern) {
  return text.match(pattern)?.length ?? 0;
}

function extract(text, pattern, description, path, failures) {
  const match = text.match(pattern);
  if (!match) failures.push(`${projectPath(path)} is missing ${description}`);
  return match?.[0] ?? "";
}

const failures = [];
const config = JSON.parse(readFileSync(resolve(projectRoot, "config/site.json"), "utf8"));
let marketplaceUrl;
try {
  marketplaceUrl = new URL(config.marketplace_url);
  if (marketplaceUrl.protocol !== "https:" || !marketplaceUrl.pathname.endsWith("/")) {
    failures.push("config/site.json marketplace_url must use HTTPS and end with /");
  }
} catch {
  failures.push("config/site.json marketplace_url must be a valid absolute URL");
}

const headerPartial = readFileSync(resolve(projectRoot, "partials/site-header.html"), "utf8");
const footerPartial = readFileSync(resolve(projectRoot, "partials/site-footer.html"), "utf8");
if (occurrences(headerPartial, /<header class="site-header">/g) !== 1) failures.push("header partial must contain exactly one site header");
if (occurrences(footerPartial, /<footer class="site-footer">/g) !== 1) failures.push("footer partial must contain exactly one site footer");
if (occurrences(headerPartial, /data-nav="[^\"]+"/g) !== expectedNavigation.length) failures.push("header partial navigation count is invalid");

const sourcePages = filesRecursively(projectRoot).filter((path) => !excludedHtmlFiles.has(projectPath(path)));
let canonicalHeader = "";
let canonicalFooter = "";

for (const sourcePath of sourcePages) {
  const source = readFileSync(sourcePath, "utf8");
  if (source.split(headerPlaceholder).length !== 2) failures.push(`${projectPath(sourcePath)} must contain exactly one header placeholder`);
  if (source.split(footerPlaceholder).length !== 2) failures.push(`${projectPath(sourcePath)} must contain exactly one footer placeholder`);
  if (source.includes('<header class="site-header">') || source.includes('<footer class="site-footer">')) {
    failures.push(`${projectPath(sourcePath)} contains a copied public shell`);
  }
  if (occurrences(source, /<main id="main-content" tabindex="-1">/g) !== 1) {
    failures.push(`${projectPath(sourcePath)} must expose one focusable main-content target`);
  }

  const outputPath = resolve(outputDirectory, relative(projectRoot, sourcePath));
  if (!existsSync(outputPath)) {
    failures.push(`missing built page ${projectPath(outputPath)}`);
    continue;
  }
  const output = readFileSync(outputPath, "utf8");
  const checks = [
    [/<header class="site-header">/g, 1, "site header"],
    [/<footer class="site-footer">/g, 1, "site footer"],
    [/class="skip-link"/g, 1, "skip link"],
    [/id="main-content"/g, 1, "main-content target"],
    [/id="primary-navigation"/g, 1, "primary navigation"],
    [/data-account-shell/g, 1, "account shell"],
    [/data-account-login/g, 1, "anonymous account entry"],
    [/data-account-menu/g, 1, "authenticated account menu"],
  ];
  for (const [pattern, expected, description] of checks) {
    if (occurrences(output, pattern) !== expected) {
      failures.push(`${projectPath(outputPath)} must contain exactly ${expected} ${description}`);
    }
  }
  if (output.includes(headerPlaceholder) || output.includes(footerPlaceholder) || output.includes("{{MARKETPLACE_URL}}")) {
    failures.push(`${projectPath(outputPath)} contains an unresolved shell token`);
  }

  const navigation = Array.from(output.matchAll(/data-nav="([^\"]+)"/g), (match) => match[1]);
  if (navigation.join(",") !== expectedNavigation.join(",")) {
    failures.push(`${projectPath(outputPath)} navigation order is ${navigation.join(",")}`);
  }

  const header = extract(output, /<a class="skip-link"[\s\S]*?<\/header>/, "rendered header", outputPath, failures);
  const footer = extract(output, /<footer class="site-footer">[\s\S]*?<\/footer>/, "rendered footer", outputPath, failures);
  if (!canonicalHeader) canonicalHeader = header;
  else if (header !== canonicalHeader) failures.push(`${projectPath(outputPath)} rendered header differs from the canonical shell`);
  if (!canonicalFooter) canonicalFooter = footer;
  else if (footer !== canonicalFooter) failures.push(`${projectPath(outputPath)} rendered footer differs from the canonical shell`);
}

if (sourcePages.length !== 19) failures.push(`expected 19 official source pages, found ${sourcePages.length}`);

if (failures.length) {
  for (const failure of failures) console.error(`[verify-shell] ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`[verify-shell] OK: ${sourcePages.length} pages share one header, footer, navigation, language and account shell`);
}

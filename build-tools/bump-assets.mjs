import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([".git", ".idea", "dist", "node_modules", ".vite"]);

function assetVersion() {
  if (process.env.ASSET_VERSION) return process.env.ASSET_VERSION.trim();
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 12);

  try {
    return execSync("git rev-parse --short=12 HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return String(Date.now());
  }
}

function htmlFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) continue;
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...htmlFiles(path));
    } else if (entry.endsWith(".html")) {
      files.push(path);
    }
  }
  return files;
}

const version = assetVersion();
const assetRef = /(\b(?:href|src)=["'])([^"']*assets\/(?:css|js)\/[^"']+\.(?:css|js))(?:\?v=[^"']*)?(["'])/g;

let changed = 0;
for (const file of htmlFiles(root)) {
  const before = readFileSync(file, "utf8");
  const after = before.replace(assetRef, (_, prefix, url, suffix) => {
    return `${prefix}${url}?v=${version}${suffix}`;
  });

  if (after !== before) {
    writeFileSync(file, after);
    changed += 1;
  }
}

console.log(`Asset version ${version} applied to ${changed} HTML file(s).`);

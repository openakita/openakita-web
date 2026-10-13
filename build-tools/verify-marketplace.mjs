import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = resolve(projectRoot, "dist");
const siteConfig = JSON.parse(readFileSync(resolve(projectRoot, "config/site.json"), "utf8"));
const marketplaceConfig = JSON.parse(readFileSync(resolve(projectRoot, "config/marketplace.json"), "utf8"));
const failures = [];

const expectedRelatedPages = new Map([
  ["download/index.html", "download"],
  ["services/index.html", "services"],
  ["scenarios/index.html", "scenarios"],
  ["tutorials/index.html", "tutorials"],
  ["tutorials/im-channels/index.html", "tutorials"],
  ["tutorials/llm-endpoints/index.html", "tutorials"],
  ["tutorials/web-search-source/index.html", "tutorials"],
  ["tutorials/install/desktop/index.html", "tutorials"],
  ["tutorials/install/pypi/index.html", "tutorials"],
  ["tutorials/install/docker/index.html", "tutorials"],
]);

function read(path) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

function output(path) {
  const target = resolve(outputDirectory, path);
  if (!existsSync(target)) {
    failures.push(`missing dist/${path}`);
    return "";
  }
  return readFileSync(target, "utf8");
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
  );
}

const targetIds = new Set();
const categoryIds = new Set();
for (const [key, target] of Object.entries(marketplaceConfig.targets)) {
  if (!target.target_id || targetIds.has(target.target_id)) failures.push(`target ${key} has a duplicate or empty target_id`);
  targetIds.add(target.target_id);
  if (target.category_id) {
    if (categoryIds.has(target.category_id)) failures.push(`target ${key} has duplicate category_id ${target.category_id}`);
    categoryIds.add(target.category_id);
  }
}

if (marketplaceConfig.featured_resources.length !== 3) {
  failures.push("featured_resources must contain exactly three editorial entries");
}

const homeSource = read("index.html");
if (count(homeSource, "<div data-marketplace-featured></div>") !== 1) {
  failures.push("index.html must contain exactly one featured Marketplace placeholder");
}
if (count(homeSource, 'data-marketplace-target="home"') !== 1) {
  failures.push("index.html must contain exactly one Marketplace home hero target");
}

for (const [path, section] of expectedRelatedPages) {
  const source = read(path);
  if (count(source, `<div data-marketplace-related="${section}"></div>`) !== 1) {
    failures.push(`${path} must contain exactly one ${section} Marketplace related placeholder`);
  }
}

for (const path of ["about/index.html", "privacy/index.html", "terms/index.html"]) {
  if (read(path).includes("data-marketplace-related")) failures.push(`${path} must remain unchanged by related-resource modules`);
}

const pages = ["index.html", ...expectedRelatedPages.keys()];
for (const path of pages) {
  const html = output(path);
  if (/data-marketplace-(?:featured|related)="/.test(html)) {
    failures.push(`dist/${path} contains an unresolved Marketplace placeholder`);
  }
  if (!html.includes("data-marketplace-copy")) {
    failures.push(`dist/${path} is missing the Marketplace translation payload`);
  }
  for (const match of html.matchAll(/<a\b[^>]*data-marketplace-target="[^"]+"[^>]*>/g)) {
    const attrs = attributes(match[0]);
    const target = marketplaceConfig.targets[attrs["data-marketplace-target"]];
    if (!target) {
      failures.push(`dist/${path} uses unknown Marketplace target ${attrs["data-marketplace-target"]}`);
      continue;
    }
    const expectedHref = new URL(target.path, siteConfig.marketplace_url).href;
    if (attrs.href !== expectedHref) failures.push(`dist/${path} target ${attrs["data-marketplace-target"]} has href ${attrs.href}, expected ${expectedHref}`);
    if (attrs["data-marketplace-target-id"] !== target.target_id) failures.push(`dist/${path} target ${attrs["data-marketplace-target"]} has the wrong target_id`);
    if ((attrs["data-marketplace-category-id"] || undefined) !== target.category_id) failures.push(`dist/${path} target ${attrs["data-marketplace-target"]} has the wrong category_id`);
  }
}

for (const [path, section] of expectedRelatedPages) {
  const html = output(path);
  if (count(html, `data-marketplace-related-section="${section}"`) !== 1) {
    failures.push(`dist/${path} must contain exactly one generated ${section} related section`);
  }
}

const homeOutput = output("index.html");
const allFeaturedPublished = marketplaceConfig.featured_resources.every((resource) => resource.availability === "published");
const resourceCardCount = count(homeOutput, 'class="marketplace-resource-card');
const detailLinkCount = count(homeOutput, "data-marketplace-resource-id=");
if (allFeaturedPublished) {
  if (resourceCardCount !== 3) failures.push(`homepage must render three featured resource cards, found ${resourceCardCount}`);
  if (homeOutput.includes("marketplace-launch-note")) failures.push("homepage must hide the launch note when all featured resources are published");
} else {
  if (resourceCardCount !== 0 || detailLinkCount !== 0) failures.push("unavailable featured resources must not render cards or detail links");
  if (count(homeOutput, "marketplace-launch-note") !== 1) failures.push("homepage must render one launch note while featured resources are unavailable");
}

const marketplaceSection = homeOutput.match(/<section class="home-section marketplace-extension-section"[\s\S]*?<\/section>/)?.[0] || "";
if (/下载量|评分|用户资产|\brating\b|\bdownloads\b/i.test(marketplaceSection)) {
  failures.push("homepage Marketplace section must not contain fabricated usage, rating, or user-asset data");
}

if (failures.length) {
  for (const failure of failures) console.error(`[verify-marketplace] ${failure}`);
  process.exitCode = 1;
} else {
  const renderedLinks = pages.reduce((total, path) => total + count(output(path), "data-marketplace-target-id="), 0);
  console.log(`[verify-marketplace] OK: ${marketplaceConfig.featured_resources.length} editorial resources, ${expectedRelatedPages.size} related pages, ${renderedLinks} configured links`);
}

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
const ignoredDirectories = new Set([".git", ".idea", ".vite", "dist", "node_modules", "partials"]);
const excludedHtmlFiles = new Set(["memu_reference.html"]);
const headerPlaceholder = '<div data-site-header></div>';
const footerPlaceholder = '<div data-site-footer></div>';

type SiteConfig = {
  marketplace_url: string;
};

type MarketplaceTarget = {
  target_id: string;
  category_id?: string;
  path: string;
};

type FeaturedResource = {
  resource_id: string | null;
  slug: string | null;
  name_key: string;
  purpose_key: string;
  scenario_key: string;
  availability: "published" | "unavailable" | "planned";
};

type RelatedSection = {
  title_key: string;
  description_key: string;
  targets: Array<{ target: string; label_key: string }>;
};

type MarketplaceConfig = {
  targets: Record<string, MarketplaceTarget>;
  featured_resources: FeaturedResource[];
  related_sections: Record<string, RelatedSection>;
  copy: Record<string, Record<string, string>>;
};

function readSiteConfig(): SiteConfig {
  const config = JSON.parse(readFileSync(resolve(projectRoot, "config/site.json"), "utf8")) as SiteConfig;
  const marketplaceUrl = new URL(config.marketplace_url);
  if (marketplaceUrl.protocol !== "https:") {
    throw new Error("config/site.json marketplace_url must use HTTPS");
  }
  if (!marketplaceUrl.pathname.endsWith("/")) {
    throw new Error("config/site.json marketplace_url must end with /");
  }
  return config;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readMarketplaceConfig(siteConfig: SiteConfig): MarketplaceConfig {
  const config = JSON.parse(
    readFileSync(resolve(projectRoot, "config/marketplace.json"), "utf8"),
  ) as MarketplaceConfig;
  const baseUrl = new URL(siteConfig.marketplace_url);
  const targetIds = new Set<string>();
  const categoryIds = new Set<string>();

  for (const required of ["home", "catalog", "plugin", "skill", "mcp", "library"]) {
    if (!config.targets[required]) throw new Error(`config/marketplace.json is missing target ${required}`);
  }
  for (const [key, target] of Object.entries(config.targets)) {
    if (!target.target_id || targetIds.has(target.target_id)) {
      throw new Error(`config/marketplace.json target ${key} must have a unique target_id`);
    }
    targetIds.add(target.target_id);
    if (target.category_id) {
      if (categoryIds.has(target.category_id)) {
        throw new Error(`config/marketplace.json target ${key} must have a unique category_id`);
      }
      categoryIds.add(target.category_id);
    }
    if (target.path.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(target.path)) {
      throw new Error(`config/marketplace.json target ${key} path must be relative`);
    }
    const targetUrl = new URL(target.path, baseUrl);
    if (targetUrl.origin !== baseUrl.origin) {
      throw new Error(`config/marketplace.json target ${key} must stay on the Marketplace origin`);
    }
  }

  if (config.featured_resources.length !== 3) {
    throw new Error("config/marketplace.json must define exactly three editorial featured resources");
  }
  for (const resource of config.featured_resources) {
    if (!["published", "unavailable", "planned"].includes(resource.availability)) {
      throw new Error(`invalid availability for featured resource ${resource.name_key}`);
    }
    if (resource.availability === "published" && (!resource.resource_id || !resource.slug)) {
      throw new Error(`published featured resource ${resource.name_key} requires resource_id and slug`);
    }
  }

  for (const [sectionKey, section] of Object.entries(config.related_sections)) {
    for (const item of section.targets) {
      if (!config.targets[item.target]) {
        throw new Error(`related section ${sectionKey} references unknown target ${item.target}`);
      }
    }
  }

  for (const language of ["zh", "en"]) {
    const translations = config.copy[language];
    if (!translations) throw new Error(`config/marketplace.json is missing ${language} copy`);
    const referencedKeys = new Set([
      "common.official",
      "common.view",
      "common.scenario",
      "home.hero",
      "home.title",
      "home.description",
      "home.journey.download",
      "home.journey.extend",
      "home.journey.install",
      "home.journey.manage",
      "home.launch.badge",
      "home.launch.title",
      "home.launch.description",
      "home.launch.action",
      ...config.featured_resources.flatMap((resource) => [
        resource.name_key,
        resource.purpose_key,
        resource.scenario_key,
      ]),
      ...Object.values(config.related_sections).flatMap((section) => [
        section.title_key,
        section.description_key,
        ...section.targets.map((item) => item.label_key),
      ]),
    ]);
    for (const key of referencedKeys) {
      if (!translations[key]) throw new Error(`config/marketplace.json ${language} copy is missing ${key}`);
    }
  }
  return config;
}

function marketplaceCopyScript(config: MarketplaceConfig): string {
  const json = JSON.stringify(config.copy).replaceAll("<", "\\u003c");
  return `<script type="application/json" data-marketplace-copy>${json}</script>`;
}

function marketplaceText(config: MarketplaceConfig, key: string): string {
  return escapeHtml(config.copy.zh[key] ?? config.copy.en[key] ?? key);
}

function marketplaceTargetAttributes(
  siteConfig: SiteConfig,
  marketplaceConfig: MarketplaceConfig,
  key: string,
): string {
  const target = marketplaceConfig.targets[key];
  if (!target) throw new Error(`unknown Marketplace target ${key}`);
  const category = target.category_id
    ? ` data-marketplace-category-id="${escapeHtml(target.category_id)}"`
    : "";
  const href = new URL(target.path, siteConfig.marketplace_url).href;
  return `data-marketplace-target="${escapeHtml(key)}" data-marketplace-target-id="${escapeHtml(target.target_id)}"${category} href="${escapeHtml(href)}"`;
}

function marketplaceTextNode(config: MarketplaceConfig, key: string, tag = "span"): string {
  return `<${tag} data-marketplace-text="${escapeHtml(key)}">${marketplaceText(config, key)}</${tag}>`;
}

function renderFeaturedMarketplace(config: MarketplaceConfig): string {
  const ready = config.featured_resources.every((resource) => resource.availability === "published");
  if (!ready) {
    return `<div class="marketplace-launch-note reveal" role="status">
      ${marketplaceTextNode(config, "home.launch.badge", "span").replace("<span ", '<span class="marketplace-badge" ')}
      <div>
        ${marketplaceTextNode(config, "home.launch.title", "h3")}
        ${marketplaceTextNode(config, "home.launch.description", "p")}
      </div>
      <a class="btn btn-secondary" data-marketplace-target="catalog" data-marketplace-text="home.launch.action">${marketplaceText(config, "home.launch.action")}</a>
    </div>${marketplaceCopyScript(config)}`;
  }

  const cards = config.featured_resources.map((resource) => {
    const href = new URL(`resources/${encodeURIComponent(resource.slug!)}`, readSiteConfig().marketplace_url).href;
    return `<article class="marketplace-resource-card reveal" data-marketplace-resource-id="${escapeHtml(resource.resource_id!)}">
      ${marketplaceTextNode(config, "common.official", "span").replace("<span ", '<span class="marketplace-badge" ')}
      ${marketplaceTextNode(config, resource.name_key, "h3")}
      ${marketplaceTextNode(config, resource.purpose_key, "p")}
      <p class="marketplace-scenario"><strong data-marketplace-text="common.scenario">${marketplaceText(config, "common.scenario")}</strong> · ${marketplaceTextNode(config, resource.scenario_key)}</p>
      <a class="text-link" data-marketplace-resource-id="${escapeHtml(resource.resource_id!)}" href="${escapeHtml(href)}" data-marketplace-text="common.view">${marketplaceText(config, "common.view")}</a>
    </article>`;
  }).join("\n");
  return `<div class="marketplace-resource-grid">${cards}</div>${marketplaceCopyScript(config)}`;
}

function renderRelatedMarketplace(config: MarketplaceConfig, key: string): string {
  const section = config.related_sections[key];
  if (!section) throw new Error(`unknown Marketplace related section ${key}`);
  const links = section.targets.map((item) =>
    `<a class="marketplace-related-link" data-marketplace-target="${escapeHtml(item.target)}" data-marketplace-text="${escapeHtml(item.label_key)}">${marketplaceText(config, item.label_key)}</a>`,
  ).join("\n");
  return `<section class="marketplace-related" data-marketplace-related-section="${escapeHtml(key)}">
    <div class="container marketplace-related-inner reveal">
      <div>
        ${marketplaceTextNode(config, section.title_key, "h2")}
        ${marketplaceTextNode(config, section.description_key, "p")}
      </div>
      <div class="marketplace-related-actions">${links}</div>
    </div>
  </section>${marketplaceCopyScript(config)}`;
}

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

function injectStaticShell(): Plugin {
  const siteConfig = readSiteConfig();
  const marketplaceConfig = readMarketplaceConfig(siteConfig);
  const replacements = new Map([
    [headerPlaceholder, readFileSync(resolve(projectRoot, "partials/site-header.html"), "utf8")],
    [footerPlaceholder, readFileSync(resolve(projectRoot, "partials/site-footer.html"), "utf8")],
  ]);

  return {
    name: "openakita-inject-static-shell",
    transformIndexHtml: {
      order: "pre",
      handler(html, context) {
        const projectPath = relative(projectRoot, context.filename).split(sep).join("/");
        if (excludedHtmlFiles.has(projectPath) || projectPath.startsWith("partials/")) return html;

        let output = html;
        for (const [placeholder, partial] of replacements) {
          if (output.split(placeholder).length !== 2) {
            throw new Error(`${projectPath} must contain exactly one ${placeholder}`);
          }
          output = output.replace(placeholder, partial);
        }
        output = output.replaceAll("{{MARKETPLACE_URL}}", siteConfig.marketplace_url);
        output = output.replaceAll(
          '<div data-marketplace-featured></div>',
          renderFeaturedMarketplace(marketplaceConfig),
        );
        output = output.replace(
          /<div data-marketplace-related="([^"]+)"><\/div>/g,
          (_match, key: string) => renderRelatedMarketplace(marketplaceConfig, key),
        );
        output = output.replace(
          /data-marketplace-target="([^"]+)"(?![^>]*\shref=)/g,
          (_match, key: string) => marketplaceTargetAttributes(siteConfig, marketplaceConfig, key),
        );
        if (/data-marketplace-(?:featured|related)=/.test(output)) {
          throw new Error(`${projectPath} contains an unresolved Marketplace placeholder`);
        }
        return output;
      },
    },
  };
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
  plugins: [injectStaticShell(), finalizeStaticOutput()],
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

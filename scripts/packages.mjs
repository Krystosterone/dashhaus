/**
 * The repo as packages, for the generators. A generator names a package and a path inside it; this file is the one
 * place that knows where packages live and which specifiers they declare. Moving a package or adding one is an edit
 * here, not a search-and-replace across scripts/new-card and scripts/new-skin.
 *
 * The reference skins (orb, field) are folders under src/skins, not workspace packages yet (C5b leaves the
 * monorepo rename to its own cut). A generated skin is a real private workspace package in the same glob:
 * `src/skins/*` matches it and ignores package-less folders such as orb.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The repo root: beside this file when Node loads it, or the test runner's cwd when Vite rewrites import.meta.url. */
export const root = (() => {
  try {
    return fileURLToPath(new URL("../", import.meta.url));
  } catch {
    return `${process.cwd()}/`;
  }
})();

/** Root `workspaces`: the shared packages, and one package per generated skin. */
export const workspaces = ["packages/*", "src/skins/*"];

const define = (dir) => {
  const manifest = JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8"));
  return { dir, name: manifest.name, exports: manifest.exports ?? {} };
};

/** The shared packages, read from their own manifests so a new subpath is declared once. */
export const packages = {
  core: define("packages/core"),
  dashboard: define("packages/dashboard"),
  deploy: define("packages/deploy"),
};

/** A file inside a shared package, relative to the repo. */
export function packageFile(packageName, path = "") {
  const entry = packages[packageName];
  if (!entry) throw new Error(`unknown package "${packageName}": add it to scripts/packages.mjs`);
  return path ? `${entry.dir}/${path}` : entry.dir;
}

/** A declared specifier for a shared package: `@dashhaus/core`, `@dashhaus/core/demo`, `@dashhaus/dashboard/card`. */
export function packageSpecifier(packageName, subpath = "") {
  const entry = packages[packageName];
  if (!entry) throw new Error(`unknown package "${packageName}": add it to scripts/packages.mjs`);
  const key = subpath ? `./${subpath}` : ".";
  const declared = Object.keys(entry.exports).some((exported) => exported === key || (exported.endsWith("/*") && key.startsWith(exported.slice(0, -1))));
  if (!declared) throw new Error(`${entry.name} declares no "${key}" export; add it to ${entry.dir}/package.json`);
  return subpath ? `${entry.name}/${subpath}` : entry.name;
}

/** The reference skins: fixed-version workspace packages beside the generated ones, named by folder. */
export const referenceSkins = {
  orb: { dir: "src/skins/orb" },
  field: { dir: "src/skins/field" },
};

const RESERVED = ["core", "dashboard", "deploy"];

/**
 * What `npm run new-skin` creates: a private workspace package named `@dashhaus/<skin>` at `src/skins/<skin>`.
 * The exports are the surface the root apps consume; a Card added later stays inside the package.
 */
export const generated = {
  workspace: "src/skins/*",
  exports: {
    ".": "./index.ts",
    "./styles/tokens.css": "./styles/tokens.css",
    "./lovelace/card": "./lovelace/card.tsx",
    "./storybook": "./storybook.tsx",
  },
  files: {
    manifest: "package.json",
    entry: "index.ts",
    tokens: "styles/tokens.css",
    lovelaceCard: "lovelace/card.tsx",
    registry: "lovelace/registry.tsx",
    storybook: "storybook.tsx",
  },
  dir(skin) {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(skin)) throw new Error(`skin "${skin}" must be lower-case kebab-case`);
    return `src/skins/${skin}`;
  },
  name(skin) {
    if (RESERVED.includes(skin)) throw new Error(`skin "${skin}" would take the reserved package @dashhaus/${skin}`);
    return `@dashhaus/${skin}`;
  },
  file(skin, path = "") {
    const dir = this.dir(skin);
    return path ? `${dir}/${path}` : dir;
  },
  specifier(skin, subpath = "") {
    const key = subpath ? `./${subpath}` : ".";
    if (!Object.keys(this.exports).some((exported) => exported === key)) throw new Error(`${this.name(skin)} declares no "${key}" export`);
    return subpath ? `${this.name(skin)}/${subpath}` : this.name(skin);
  },
};

/** A skin's folder, whichever kind it is. */
export function skinDir(skin) {
  return referenceSkins[skin]?.dir ?? generated.dir(skin);
}

/** A generated skin's manifest content, filled by the skin template; the map owns the name and exports. */
export function generatedManifest(skin) {
  const name = generated.name(skin);
  return {
    name,
    version: "0.0.0",
    private: true,
    type: "module",
    sideEffects: ["./styles/tokens.css"],
    exports: generated.exports,
    dependencies: { [packages.core.name]: "*", [packages.dashboard.name]: "*" },
    peerDependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
  };
}

/**
 * Files outside a skin that a generator registers into. Each has a marker comment (`markers` below); a marker
 * moving is the only thing that can break a dry run, not an unrelated line in the file.
 */
export const seams = {
  preview: ".storybook/preview.tsx",
  lovelaceEntry: "apps/lovelace/entry.ts",
  generatedSkins: "scripts/generated-skins.mjs",
  agents: "AGENTS.md",
  cardsDoc: "docs/cards.md",
  deployDoc: "docs/deploy.md",
  fieldDoc: "docs/field.md",
  skinDoc: (skin) => `docs/${skin}.md`,
  orb: {
    config: `${referenceSkins.orb.dir}/lovelace/config.ts`,
    renderer: `${referenceSkins.orb.dir}/lovelace/ConfigDashboard.tsx`,
    auto: `${referenceSkins.orb.dir}/lovelace/auto.ts`,
    rulebook: "verify/orb-conformance.test.ts",
  },
  field: {
    config: `${referenceSkins.field.dir}/lovelace/config.ts`,
    dashboard: `${referenceSkins.field.dir}/lovelace/FieldDashboard.tsx`,
  },
};

/** Marker comments the generators insert after. They never carry data; they only fix a registration point. */
export const markers = {
  previewImports: "// new-skin: storybook imports",
  previewSetups: "// new-skin: storybook setups",
  previewSections: "// new-skin: section order",
  previewCards: "// new-card: cards",
  previewConnected: "// new-card: connected",
  entryTokens: "// new-skin: token css",
  entryCards: "// new-skin: card definitions",
  entryDefines: "// new-skin: define cards",
  generatedSkins: "// new-skin: dashboards",
  skinCards: "// new-card: card exports",
  registryImports: "// new-card: registry imports",
  registryEntries: "// new-card: registry entries",
  designRuleImports: "// new-card: design rule imports",
  designRuleStories: "// new-card: design rule stories",
  dashboardCards: "// new-card: dashboard cards",
  coreExports: "// new-card: exports",
  headlessImports: "// new-card: headless imports",
  headlessComponents: "// new-card: headless components",
  demoTransports: "// new-card: demo transports",
  fixtureImports: "// new-card: fixture imports",
  mapperImports: "// new-card: mapper imports",
  fixtures: "// new-card: fixtures",
  kinds: "// new-card: kinds",
  domainKinds: "// new-card: domain kinds",
  sharedKinds: "// new-card: shared kinds",
  cardConfigs: "// new-card: card configs",
  kindSpecs: "// new-card: kind specs",
  fieldKinds: "// new-card: field kinds",
  moduleImports: "// new-card: module imports",
  liveModules: "// new-card: live modules",
  tileImports: "// new-card: tile imports",
  tiles: "// new-card: tiles",
  autoControls: "// new-card: auto controls",
  autoOrder: "// new-card: auto order",
  cardsDoc: "<!-- new-card: cards -->",
  deployDomains: "<!-- new-card: domains -->",
  deployOptions: "<!-- new-card: options -->",
  orbCodes: "<!-- new-card: orb codes -->",
  fieldCodes: "<!-- new-card: field codes -->",
};

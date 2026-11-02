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
export const workspaces = ["packages/*", "src/skins/*", "docs"];

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
  if (!entry) throw new Error(`unknown package "${packageName}": add it to scripts/packages.js`);
  return path ? `${entry.dir}/${path}` : entry.dir;
}

/** A declared specifier for a shared package: `@dashhaus/core`, `@dashhaus/core/demo`, `@dashhaus/dashboard/card`. */
export function packageSpecifier(packageName, subpath = "") {
  const entry = packages[packageName];
  if (!entry) throw new Error(`unknown package "${packageName}": add it to scripts/packages.js`);
  const key = subpath ? `./${subpath}` : ".";
  const declared = Object.keys(entry.exports).some((exported) => exported === key || (exported.endsWith("/*") && key.startsWith(exported.slice(0, -1))));
  if (!declared) throw new Error(`${entry.name} declares no "${key}" export; add it to ${entry.dir}/package.json`);
  return subpath ? `${entry.name}/${subpath}` : entry.name;
}

/**
 * The templates every skin starts from. The published scaffolder owns them, so a skin made in this repository and one
 * made outside it start from the same files; `new-skin` and `new-card` lay them out under `src/skins/<skin>/` and add
 * the in-repo extras from their own templates. Each folder's files are laid out from a skin's root.
 */
export const skinTemplates = {
  /** The package that owns them. */
  package: "packages/create-dashhaus-skin",
  /** What turns a domain's description into its card's tokens and registry rows (`filler`, `cardTokens`, …). */
  writer: "packages/create-dashhaus-skin/src/card.js",
  /** The core every skin shares: tokens, parts, the page and the Lovelace card. */
  skin: "packages/create-dashhaus-skin/src/templates/skin",
  /** One domain's card and its Home Assistant adapter. */
  card: "packages/create-dashhaus-skin/src/templates/card",
};

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

/**
 * A study: a skin an agent built, kept so people can see it, use it and build on it. It is not finished or polished
 * and it doesn't ship: `new-skin --study` (which `npm run study:keep` runs) generates it like any skin, then marks it,
 * files its stories under `Studies/<Name>` and leaves it out of the Lovelace bundle and the deploy config
 * (spec/skins.md → Studies). Everything that treats a study differently reads the marker in its manifest; what the
 * study's run was is its `study.json` (`studies.record`).
 */
export const studies = {
  /** Storybook's top-level section every study sits under. */
  group: "Studies",
  /** A study's own Storybook section. */
  section: (Section) => `Studies/${Section}`,
  /** The manifest's marker: present on a study, with the theme toolbar global the docs site embeds its stories with. */
  marker: (theme) => ({ study: { theme } }),
  /** Whether a skin's manifest marks it a study. */
  is: (manifest) => Boolean(manifest?.dashhaus?.study),
  /** A study's design rules live in its own folder, never in spec/: the specs describe the shipped skins only. */
  designDoc: (skin) => `${generated.dir(skin)}/design.md`,
  /** How it was made and from what (scripts/study/lib.js → StudyRecord), beside its README. */
  record: (skin) => `${generated.dir(skin)}/study.json`,
  /** What it looked like: the run's snapshots and the dashboard it deployed. */
  captures: (skin) => `${generated.dir(skin)}/captures`,
};

/** A skin's Storybook section, as its `storybook.tsx` declares it: `Field`, or `Studies/Atelier` for a study. */
export function storySection(storybookSource) {
  return storybookSource.match(/^\s*section: "([^"]+)",?$/m)?.[1];
}

/**
 * A generated skin's manifest content, filled by the skin template; the map owns the name and exports. A study adds
 * a description saying what it is, and the marker with its theme toolbar global (`{ global, light, dark }`).
 */
export function generatedManifest(skin, { study, Section, theme } = {}) {
  const name = generated.name(skin);
  return {
    name,
    version: "0.0.0",
    ...(study && { description: `A study: the ${Section} skin an agent built. Not finished or polished; use it, build on it, contribute back.` }),
    private: true,
    type: "module",
    sideEffects: ["./styles/tokens.css"],
    exports: generated.exports,
    dependencies: { [packages.core.name]: "*", [packages.dashboard.name]: "*" },
    peerDependencies: { react: "^18.3.1 || ^19.0.0", "react-dom": "^18.3.1 || ^19.0.0" },
    ...(study && { dashhaus: studies.marker(theme) }),
  };
}

/**
 * Files outside a skin that a generator registers into. Each has a marker comment (`markers` below); a marker
 * moving is the only thing that can break a dry run, not an unrelated line in the file.
 */
export const seams = {
  preview: ".storybook/preview.tsx",
  lovelaceEntry: "apps/lovelace/entry.ts",
  generatedSkins: "scripts/generated-skins.js",
  agents: "AGENTS.md",
  cardsDoc: "spec/cards.md",
  deployDoc: "spec/deploy.md",
  fieldDoc: "spec/field.md",
  /** A shipped skin's design rules; a study keeps its own in its folder (`studies.designDoc`). */
  skinDoc: (skin) => `spec/${skin}.md`,
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
  previewStudies: "// new-skin: study order",
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
  exampleImports: "// new-card: example imports",
  exampleSections: "// new-card: example sections",
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

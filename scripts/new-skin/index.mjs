#!/usr/bin/env node
/**
 * Creates a neutral, complete skin shell and registers it everywhere a skin exists:
 *
 *   npm run new-skin -- canvas [--dry-run]
 *
 * The shell deliberately has no entity cards. Add real domains with the normal generator:
 *
 *   npm run new-card -- light --skin canvas
 */
import { fileURLToPath } from "node:url";
import { before, changes, exists, filler, read } from "../new-card/lib.mjs";

const fail = (message) => {
  console.error(`new-skin: ${message}`);
  process.exit(1);
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
if (dryRun) args.splice(args.indexOf("--dry-run"), 1);
const [skin, ...extra] = args;
const usage = "usage: npm run new-skin -- <lower-case-kebab-name> [--dry-run]\n       e.g. npm run new-skin -- canvas";
if (!skin || extra.length) fail(usage);
if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(skin)) fail(`name "${skin}" must be lower-case kebab-case, like "quiet-glass"`);

const parts = skin.split("-");
const Skin = parts.map((part) => part[0].toUpperCase() + part.slice(1)).join("");
const skinVar = parts[0] + parts.slice(1).map((part) => part[0].toUpperCase() + part.slice(1)).join("");
const Section = parts.map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
const SKIN_CONST = parts.join("_").toUpperCase();
const dir = `src/skins/${skin}`;
const docs = `docs/${skin}.md`;
if (exists(dir)) fail(`${dir} already exists`);
if (exists(docs)) fail(`${docs} already exists`);

const preview = read(".storybook/preview.tsx");
if (preview.includes(`section: "${Section}"`) || preview.includes(`"${Section}", [`)) fail(`Storybook section "${Section}" is already registered`);
const entry = read("apps/lovelace/entry.ts");
if (entry.includes(`define${Skin}Card(`)) fail(`Lovelace card "home-dashboard-${skin}" is already registered`);

const fill = filler({
  __skin__: skin,
  __Skin__: Skin,
  __skinVar__: skinVar,
  __Section__: Section,
  __SKIN_CONST__: SKIN_CONST,
});
const templateRoot = fileURLToPath(new URL("./templates/", import.meta.url));
const change = changes({ templateRoot, onFail: fail });
change.fromTemplates(["base"], fill);

// Storybook: setup, decorator selection, and a literal order for its static indexer.
change.edit(".storybook/preview.tsx", before("\n/**", fill(`import { __skinVar__Storybook } from "../src/skins/__skin__/storybook";\n`)));
change.edit(".storybook/preview.tsx", (source) => source.replace(
  /const SKINS = \[([^\]]*)\];/,
  (line, items) => `const SKINS = [${items.trimEnd()}, ${skinVar}Storybook];`,
));
change.edit(".storybook/preview.tsx", (source) => {
  const anchor = "        ],\n      },\n    },\n  },\n};";
  const at = source.lastIndexOf(anchor);
  if (at === -1) return source;
  return source.slice(0, at) + fill(`          "__Section__", [\n            "Cards",\n            "Dashboards", ["Examples", "Lovelace card", "Header", "Nav bar"],\n            "Foundations", ["Design rules", "Palette", "Parts"],\n            "Connected",\n          ],\n`) + source.slice(at);
});

// The base template writes the skin's own entry (src/skins/<skin>/index.ts): it imports its scoped tokens and
// exports its parts and dashboard furniture.

// Home Assistant bundle and deploy's first-run dashboard list.
change.edit("apps/lovelace/entry.ts", before("\ndeclare const __HOME_DASHBOARD_BUILD__", fill(`import "../../src/skins/__skin__/styles/tokens.css";\nimport { define__Skin__Card } from "../../src/skins/__skin__/lovelace/card";\n`)));
change.edit("apps/lovelace/entry.ts", before("console.info", fill(`define__Skin__Card(css);\n`)));
change.edit("scripts/generated-skins.mjs", before("\n];", fill(`\n  { id: "__skin__", title: "Home (__Section__)", icon: "mdi:view-dashboard-outline" },`)));

// The generated design contract and its Lovelace YAML are discoverable from the repository docs.
change.edit("docs/deploy.md", (source) => `${source.trimEnd()}\n\n## The ${Section} dashboard\n\nThe generated ${Section} skin ships as \`custom:home-dashboard-${skin}\`. Without \`cards\` or \`sections\`, it draws every supported entity Card added with \`npm run new-card -- <domain> --skin ${skin}\`, grouped by Home Assistant area.\n\n\`\`\`yaml\ntype: custom:home-dashboard-${skin}\ntitle: Home\n\`\`\`\n`);

if (!change.commit(dryRun)) process.exit(0);
console.log(`Created the ${Section} skin: ${change.writes.size} files and registrations.\n\nNext:\n  1. npm run new-card -- light --skin ${skin}\n  2. npm run storybook  →  ${Section}/Foundations and ${Section}/Dashboards\n  3. Replace the neutral tokens and parts using docs/${skin}.md as the design contract\n  4. npm run check && npm run test-storybook && npm run build:ha`);

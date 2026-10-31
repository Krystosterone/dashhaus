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
import { generated, generatedManifest, markers, seams } from "../packages.mjs";
import { after, changes, exists, filler, read } from "../new-card/lib.mjs";

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
const dir = generated.dir(skin);
const docs = seams.skinDoc(skin);
try {
  generated.name(skin);
} catch (error) {
  fail(error.message);
}
if (exists(dir)) fail(`${dir} already exists`);
if (exists(docs)) fail(`${docs} already exists`);

const preview = read(seams.preview);
if (preview.includes(`section: "${Section}"`) || preview.includes(`"${Section}", [`)) fail(`Storybook section "${Section}" is already registered`);
const entry = read(seams.lovelaceEntry);
if (entry.includes(`define${Skin}Card(`)) fail(`Lovelace card "dashhaus-${skin}" is already registered`);

const fill = filler({
  __skin__: skin,
  __Skin__: Skin,
  __skinVar__: skinVar,
  __Section__: Section,
  __SKIN_CONST__: SKIN_CONST,
  __storybookSpecifier__: generated.specifier(skin, "storybook"),
  __tokensSpecifier__: generated.specifier(skin, "styles/tokens.css"),
  __cardSpecifier__: generated.specifier(skin, "lovelace/card"),
});
const templateRoot = fileURLToPath(new URL("./templates/", import.meta.url));
const change = changes({ templateRoot, onFail: fail });
change.fromTemplates(["base"], fill);
// The skin is a private workspace package: `npm install` links its name and the root apps import its exports.
change.create(generated.file(skin, generated.files.manifest), `${JSON.stringify(generatedManifest(skin), null, 2)}\n`);

// Storybook: setup, decorator selection, and a literal order for its static indexer.
change.edit(seams.preview, after(markers.previewImports, fill(`import { __skinVar__Storybook } from "__storybookSpecifier__";
`)));
change.edit(seams.preview, after(markers.previewSetups, fill(`  __skinVar__Storybook,
`)));
change.edit(seams.preview, after(markers.previewSections, fill(`          "__Section__", [
            "Cards", [
              // new-card: cards
            ],
            "Dashboards", ["Examples", "Lovelace card", "Header", "Nav bar"],
            "Foundations", ["Design rules", "Palette", "Parts"],
            "Connected", [
              // new-card: connected
            ],
          ],
`)));

// Home Assistant bundle: the package's token CSS and its card, by the specifiers its manifest declares.
change.edit(seams.lovelaceEntry, after(markers.entryTokens, fill(`import "__tokensSpecifier__";
`)));
change.edit(seams.lovelaceEntry, after(markers.entryCards, fill(`import { define__Skin__Card } from "__cardSpecifier__";
`)));
change.edit(seams.lovelaceEntry, after(markers.entryDefines, fill(`define__Skin__Card(css);
`)));
change.edit(seams.generatedSkins, after(markers.generatedSkins, fill(`  { id: "__skin__", title: "Home (__Section__)", icon: "mdi:view-dashboard-outline" },`)));

// The generated design contract and its Lovelace YAML are discoverable from the repository docs.
change.edit(seams.deployDoc, (source) => `${source.trimEnd()}\n\n## The ${Section} dashboard\n\nThe generated ${Section} skin ships as \`custom:dashhaus-${skin}\` from the private \`${generated.name(skin)}\` package. Without \`cards\` or \`sections\`, it draws every supported entity Card added with \`npm run new-card -- <domain> --skin ${skin}\`, grouped by Home Assistant area.\n\n\`\`\`yaml\ntype: custom:dashhaus-${skin}\ntitle: Home\n\`\`\`\n`);

if (!change.commit(dryRun)) process.exit(0);
console.log(`Created the ${Section} skin: ${change.writes.size} files and registrations.\n\nNext:\n  1. npm run new-card -- light --skin ${skin}\n  2. npm run storybook  →  ${Section}/Foundations and ${Section}/Dashboards\n  3. Replace the neutral tokens and parts using ${docs} as the design contract\n  4. npm run check && npm run test-storybook && npm run build:ha`);

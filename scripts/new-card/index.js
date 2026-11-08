/**
 * Scaffolds a card that already follows the framework, Home Assistant side included:
 *
 *   npm run new-card -- <name> --code <xx> --domain <ha_domain> [--kind control|reading] [--unit <unit>] [--dry-run]
 *   npm run new-card -- fan --code fn --domain fan
 *   npm run new-card -- co2 --code co --domain sensor --kind reading --unit ppm
 *
 * Without `--domain`, for a domain core already has, it draws only orb's card, from the domain's description
 * (./orb.js); with `--skin field` it draws one in the field skin instead (./field.js).
 *
 * It copies ./templates/common plus ./templates/<kind> with the names filled in, then registers the card
 * everywhere the conformance test (verify/orb-conformance.test.ts) looks, the Lovelace card included:
 *   - control (default): an on/off entity with an orb and a pill, over `<domain>.toggle`.
 *   - reading: a read-only number with a bare icon and a readout, no services.
 * Nothing is written unless every file and every registration can be made.
 */
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generated as generatedSkin, markers, packageFile, packageSpecifier } from "../packages.js";
import { after, before, changes, exists, fail, filler, names, orbKinds, read, root, seams, skinDir } from "./lib.js";
import { newFieldCard } from "./field.js";
import { newOrbCard } from "./orb.js";
import { newGeneratedCard } from "./generated.js";
import { domainsFile, domainsJson } from "../domains.js";

/** The skin a new card is drawn in; its logic goes outside it, in @dashhaus/core. */
const SKIN = skinDir("orb");

// ---------- Arguments ----------
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};
const dryRun = args.includes("--dry-run");
if (dryRun) args.splice(args.indexOf("--dry-run"), 1);
const skin = flag("skin") ?? "orb";
if (skin !== "orb") {
  const kind = flag("kind");
  const code = flag("code");
  const [skinName, ...rest] = args;
  const generated = exists(generatedSkin.file(skin, generatedSkin.files.registry)) && exists(generatedSkin.file(skin, generatedSkin.files.manifest));
  if (!skinName || rest.length) fail(`usage: npm run new-card -- <name> --skin ${skin} [--kind control|reading] [--dry-run]`);
  if (generated && code != null) fail("--code belongs to Orb and the mature Field adapter; generated skins use their full skin and Card names as the CSS namespace");
  if (generated) newGeneratedCard({ skin, name: skinName, kind, dryRun });
  else if (skin === "field") newFieldCard({ name: skinName, kind, code, dryRun });
  else fail(`skin "${skin}" doesn't exist or wasn't created by npm run new-skin -- ${skin}`);
  process.exit(0);
}
const code = flag("code");
const domain = flag("domain");
const askedKind = flag("kind");
const kind = askedKind ?? "control";
const unit = flag("unit");
const [name, ...extra] = args;
// A domain core already has, with no --domain: orb draws it from its description, as field does.
if (name && !domain && !extra.length && /^[a-z][a-zA-Z0-9]*$/.test(name) && existsSync(join(root, packageFile("core", "src/entities"), name))) {
  if (unit != null) fail("--unit is for a new reading's domain");
  newOrbCard({ name, code, kind: askedKind, dryRun });
  process.exit(0);
}
const usage = "usage: npm run new-card -- <name> --code <xx> --domain <ha_domain> [--kind control|reading] [--unit <unit>] [--dry-run]\n" +
  "       e.g. npm run new-card -- fan --code fn --domain fan\n" +
  "            npm run new-card -- co2 --code co --domain sensor --kind reading --unit ppm";
if (!name || !code || !domain || extra.length) fail(usage);
if (kind !== "control" && kind !== "reading") fail(`kind "${kind}" must be "control" (on/off, with services) or "reading" (read-only number)`);
if (unit != null && kind !== "reading") fail("--unit is for --kind reading");
const reading = kind === "reading";

// ---------- Validation ----------
const { Name, CONST, words, Label } = names(name, '"fan" or "airPurifier"');
for (const dir of [`${SKIN}/cards`, packageFile("core", "src/entities")]) if (existsSync(join(root, dir, name))) fail(`${dir}/${name} already exists`);
// Names the dashboard stories already use as identifiers.
if (["cell", "columns", "section", "device", "bundle", "dashboardPage", "cardGrid"].includes(name)) fail(`"${name}" is taken by the dashboard layout`);
if (!/^[a-z]{2}$/.test(code)) fail(`code "${code}" must be two lower-case letters: the card's CSS class prefix`);
if (!/^[a-z][a-z0-9_]*$/.test(domain)) fail(`domain "${domain}" must be a Home Assistant domain, like "fan" or "input_boolean"`);

const agents = read(seams.agents);
const taken = new Set([...agents.matchAll(/`([a-z]{2})-`/g)].map((m) => m[1]));
for (const dir of readdirSync(join(root, SKIN, "cards")).filter((d) => statSync(join(root, SKIN, "cards", d)).isDirectory())) {
  for (const file of readdirSync(join(root, SKIN, "cards", dir)).filter((f) => f.endsWith("Card.tsx"))) {
    const used = read(`${SKIN}/cards/${dir}/${file}`).match(/useCard\("([a-z]+)"/)?.[1];
    if (used) taken.add(used);
  }
}
if (taken.has(code)) fail(`code "${code}" is taken; in use: ${[...taken].sort().join(", ")}`);

// ---------- Names ----------
const tokens = {
  __Name__: Name,
  __name__: name,
  __CONST__: CONST,
  __Label__: Label,
  __label__: words,
  __code__: code,
  __domain__: domain,
  __unit__: unit ?? "%",
};
const fill = filler(tokens);

// ---------- Files from the template ----------
// The kind's own files win over common ones.
const change = changes();
const { writes, edit } = change;
change.fromTemplates(["common", kind], fill);
// The demo transport joins the package's demo barrel, the one public address for it.
edit(packageFile("core", "src/demo/index.ts"), after(markers.demoTransports, fill(`export * from "./__name__";
`)));
// And the demo house, so Storybook's whole dashboards and a scaffolded skin's preview have one to draw.
edit(packageFile("core", "src/demo/house.ts"), after(markers.houseImports, fill(`import { createDemo__Name__HaTransport } from "./__name__";
`)));
edit(packageFile("core", "src/demo/house.ts"), after(markers.houseParts, fill(`    createDemo__Name__HaTransport(),
`)));

// ---------- Registrations ----------

// The orb skin's public entry: the card, its tile and its connected tile. The shared hook, the headless
// component and its types are registered with the Home Assistant slice below.
edit(`${SKIN}/index.ts`, after(markers.skinCards, fill(`// __Label__
export { __Name__Card, __Name__Sheet } from "./cards/__name__/__Name__Card";
export type { __Name__CardProps, __Name__SheetProps } from "./cards/__name__/__Name__Card";
export { __Name__Tile } from "./cards/__name__/__Name__Tile";
export type { __Name__TileProps } from "./cards/__name__/__Name__Tile";
export { Ha__Name__Tile } from "./ha/Ha__Name__Tile";
export type { Ha__Name__TileProps } from "./ha/Ha__Name__Tile";

`)));

edit(packageFile("core", "src/index.ts"), after(markers.coreExports, fill(`export { __name__FromHass } from "./ha/mappers/__name__";
export type { __Name__MapOptions } from "./ha/mappers/__name__";
${reading ? "" : `export { create__Name__Handlers, __CONST___ACTIONS } from "./ha/actions/__name__";
export type { __Name__Handlers, __Name__HandlerOptions } from "./ha/actions/__name__";
`}export { useHa__Name__ } from "./ha/hooks/__name__";
export type { Ha__Name__Options, Ha__Name__Result } from "./ha/hooks/__name__";
export { Ha__Name__ } from "./ha/headless";
`)));

// Its headless component: the hook as a component that draws nothing.
const headless = packageFile("core", "src/ha/headless.tsx");
edit(headless, after(markers.headlessImports, fill(`import { useHa__Name__ } from "./hooks/__name__";
`)));
edit(headless, after(markers.headlessComponents, fill(`export const Ha__Name__ = headless(useHa__Name__, "Ha__Name__");
`)));

// Every fixture runs through the real mapper.
const fixtures = packageFile("core", "src/ha/mappers/fixtures.test.ts");
edit(fixtures, after(markers.fixtureImports, fill(`import __name__ from "../fixtures/__name__.json";
`)));
edit(fixtures, after(markers.mapperImports, fill(`import { __name__FromHass } from "./__name__";
`)));
edit(fixtures, after(markers.fixtures, fill(`  { domain: "__label__", fixture: __name__, map: __name__FromHass, keepsState: ${!reading} },`)));

// The per-card spec, for the author to finish.
edit(seams.cardsDoc, before(markers.cardsDoc, fill(reading ? `## Using the __label__ card

One \`__domain__.*\` reading:

\`\`\`tsx
<__Name__Tile entity={entity} history={today} />
<Ha__Name__Tile entityId="__domain__.living_room" />
\`\`\`

- **A reading:** a bare icon, the figure as a readout with no container, and no glow. Tap the reading or the name for the sheet.
- **Status line:** the area.
- **Unavailable:** \`unknown\`, \`unavailable\` and a missing entity say Unavailable and hide the last value; a state that isn't a number is "No reading yet".
- **Featured and sheet:** today's readings by hour, with the low and the high.

` : `## Using the __label__ card

One \`__domain__.*\` entity, switched on and off:

\`\`\`tsx
<__Name__Tile entity={entity} history={today} onToggle={toggle} />
<Ha__Name__Tile entityId="__domain__.bedroom" />
\`\`\`

- **Switching:** the orb and the pill both toggle it. Both are raised buttons when off and the accent when on (a state: no bloom, no glow).
- **Status line:** the area. It never says On or Off; that's the pill's word.
- **Sheet:** press and hold the orb, or tap the name, for today's history.

`)));

// The class prefix joins the hard rules.
edit(seams.agents, before(markers.orbCodes, `, \`${code}-\` ${words}`));

// Foundations → Worst case: its worst-case seeds beside every other card's (verify/storybook.test.ts).
edit(seams.orb.worstCase, after(markers.worstCaseImports, fill(`import { Demo__Name__Tile } from "../cards/__name__/demo/Demo__Name__Tile";
import { __CONST___SEEDS, __CONST___WORST_CASE } from "${packageSpecifier("core", `seeds/${name}`)}";
`)));
edit(seams.orb.worstCase, after(markers.worstCases, fill(`  card(__CONST___WORST_CASE, [__CONST___SEEDS.${reading ? "normal" : "on"}], (seed, footprint) => <Demo__Name__Tile seed={seed} footprint={footprint} />),`)));

// A card on the Lovelace dashboard. The domain picks it; when the domain already has a card, `card:` does.
const { path: lovelace, domainKind } = orbKinds();
const sharesDomain = domain in domainKind;
edit(lovelace, after(markers.kinds, `  | "${name}"\n`));
edit(lovelace, after(sharesDomain ? markers.sharedKinds : markers.domainKinds, sharesDomain ? `  ${name}: { domains: ["${domain}"] },` : `  ${domain}: "${name}",`));
edit(lovelace, after(markers.cardConfigs, `  | { kind: "${name}"${reading ? "; unit?: string" : ""} }`));
edit(lovelace, after(markers.kindSpecs, reading ? `  ${name}: { keys: ["unit"], options: (read, raw, at) => ({ unit: read.string(raw, "unit", at) }) },` : `  ${name}: {},`));
const renderer = seams.orb.renderer;
edit(renderer, after(markers.tileImports, fill(`import { Ha__Name__Tile } from "../ha/Ha__Name__Tile";
`)));
edit(renderer, after(markers.tiles, fill(`  __name__: (card, key) => <Ha__Name__Tile key={key} entityId={card.entity} name={card.name} footprint={card.footprint} showControl={card.showControl} loadHistory={card.history} area={card.area}${reading ? " unit={card.unit}" : ""} />,`)));
// The automatic layout: a control on a domain of its own joins the compact controls per area.
const placed = !reading && !sharesDomain;
if (placed) {
  edit(seams.orb.auto, after(markers.autoControls, `    "${domain}",\n`));
  edit(seams.orb.auto, after(markers.autoOrder, `    "${domain}",\n`));
}
const deploy = seams.deployDoc;
edit(deploy, after(markers.deployDomains, `- \`${domain}\`${sharesDomain ? ` with \`card: ${name}\`` : ""}: ${words}\n`));
if (reading) edit(deploy, before("| bundle | `joined", `| ${words} | \`unit\` | The unit, when the entity doesn't say. |\n`));

// ---------- Write ----------
if (!change.commit(dryRun)) process.exit(0);
// A new shared domain: the scaffolder's add command can draw it too, once its description is in domains.json.
writeFileSync(join(root, domainsFile), domainsJson());

const created = [...writes.keys()].filter((p) => p.includes(`/${name}`) || p.includes(`${Name}`));
console.log(`Created the ${words} ${kind} card (${code}-, ${domain}.*): ${created.length} files, registered in ${writes.size - created.length} more.

Next:
  1. npm run storybook  →  Orb/Cards/${Name} and Orb/Connected/${Name}
  2. Make it the ${words}: fields in ${packageFile("core", `src/entities/${name}/types.ts`)}, the card in ${Name}Card.tsx,
     attributes in ${packageFile("core", `src/ha/mappers/${name}.ts`)}${reading ? "" : `, services in ${packageFile("core", `src/ha/actions/${name}.ts`)}`}
  3. Draw its icon in ${SKIN}/cards/${name}/icons.tsx
  4. Finish "Using the ${words} card" in ${seams.cardsDoc}
  5. Its Lovelace card: its YAML keys in ${seams.orb.config} and ${seams.deployDoc}${placed ? "" : `,
     and its place in the automatic layout, ${seams.orb.auto}`}${sharesDomain ? `
     (${domain}.* already has a card, so a card picks this one with \`card: ${name}\`, or without it
     once its SHARED_KINDS entry has an \`id\` pattern for its entity ids, as owlet's does)` : ""}
  6. npm run check && npm run test-storybook`);

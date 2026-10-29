/**
 * Scaffolds a card that already follows the framework, Home Assistant side included:
 *
 *   npm run new-card -- <name> --code <xx> --domain <ha_domain> [--kind control|reading] [--unit <unit>] [--dry-run]
 *   npm run new-card -- fan --code fn --domain fan
 *   npm run new-card -- co2 --code co --domain sensor --kind reading --unit ppm
 *
 * With `--skin field` it draws a domain that already exists in the field skin instead (./field.mjs).
 *
 * It copies ./templates/common plus ./templates/<kind> with the names filled in, then registers the card
 * everywhere the conformance test (src/skins/orb/cards/conformance.test.ts) looks, the Lovelace card included:
 *   - control (default): an on/off entity with an orb and a pill, over `<domain>.toggle`.
 *   - reading: a read-only number with a bare icon and a readout, no services.
 * Nothing is written unless every file and every registration can be made.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterLast, before, changes, fail, filler, intoObject, names, orbKinds, read, root } from "./lib.mjs";

/** The skin a new card is drawn in; its logic goes outside it, in src/domains/ and src/ha/. */
const SKIN = "src/skins/orb";

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
if (skin === "field") {
  const { newFieldCard } = await import("./field.mjs");
  const options = { kind: flag("kind"), code: flag("code"), dryRun };
  const [fieldName, ...rest] = args;
  if (!fieldName || rest.length) fail("usage: npm run new-card -- <name> --skin field [--kind control|reading] [--code <xx>] [--dry-run]\n       e.g. npm run new-card -- sound --skin field");
  newFieldCard({ name: fieldName, ...options });
  process.exit(0);
}
if (skin !== "orb") fail(`skin "${skin}" must be "orb" (the default) or "field"`);
const code = flag("code");
const domain = flag("domain");
const kind = flag("kind") ?? "control";
const unit = flag("unit");
const [name, ...extra] = args;
const usage = "usage: npm run new-card -- <name> --code <xx> --domain <ha_domain> [--kind control|reading] [--unit <unit>] [--dry-run]\n" +
  "       e.g. npm run new-card -- fan --code fn --domain fan\n" +
  "            npm run new-card -- co2 --code co --domain sensor --kind reading --unit ppm";
if (!name || !code || !domain || extra.length) fail(usage);
if (kind !== "control" && kind !== "reading") fail(`kind "${kind}" must be "control" (on/off, with services) or "reading" (read-only number)`);
if (unit != null && kind !== "reading") fail("--unit is for --kind reading");
const reading = kind === "reading";

// ---------- Validation ----------
const { Name, CONST, words, Label } = names(name, '"fan" or "airPurifier"');
for (const dir of [`${SKIN}/cards`, "src/domains"]) if (existsSync(join(root, dir, name))) fail(`${dir}/${name} already exists`);
// Names the dashboard stories already use as identifiers.
if (["cell", "columns", "section", "device", "bundle", "dashboardPage", "cardGrid"].includes(name)) fail(`"${name}" is taken by the dashboard layout`);
if (!/^[a-z]{2}$/.test(code)) fail(`code "${code}" must be two lower-case letters: the card's CSS class prefix`);
if (!/^[a-z][a-z0-9_]*$/.test(domain)) fail(`domain "${domain}" must be a Home Assistant domain, like "fan" or "input_boolean"`);

const agents = read("AGENTS.md");
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

// ---------- Registrations ----------

// Public exports: the card, its tile, its types, its hook and its connected tile.
edit("src/index.ts", before('export { JoinedBundle, LeadBundle, TitledBundle } from "./skins/orb/bundles/Bundle";', fill(`// __Label__
export { __Name__Card, __Name__Sheet } from "./skins/orb/cards/__name__/__Name__Card";
export type { __Name__CardProps, __Name__SheetProps } from "./skins/orb/cards/__name__/__Name__Card";
export { __Name__Tile } from "./skins/orb/cards/__name__/__Name__Tile";
export type { __Name__TileProps } from "./skins/orb/cards/__name__/__Name__Tile";
export type { __Name__Entity, __Name__History } from "./domains/__name__/types";
export { useHa__Name__, Ha__Name__ } from "./ha";
export type { Ha__Name__Options, Ha__Name__Result } from "./ha";
export { Ha__Name__Tile } from "./skins/orb/ha/Ha__Name__Tile";
export type { Ha__Name__TileProps } from "./skins/orb/ha/Ha__Name__Tile";

`)));

edit("src/ha/index.ts", (s) => s + fill(`export { __name__FromHass } from "./mappers/__name__";
export type { __Name__MapOptions } from "./mappers/__name__";
${reading ? "" : `export { create__Name__Handlers } from "./actions/__name__";
export type { __Name__Handlers, __Name__HandlerOptions } from "./actions/__name__";
`}export { useHa__Name__ } from "./hooks/__name__";
export type { Ha__Name__Options, Ha__Name__Result } from "./hooks/__name__";
export { Ha__Name__ } from "./headless";
`));

// Its headless component: the hook as a component that draws nothing.
edit("src/ha/headless.tsx", afterLast(/^import \{ useHa\w+ \} from "\.\/hooks\/.*$/gm, fill(`import { useHa__Name__ } from "./hooks/__name__";\n`)));
edit("src/ha/headless.tsx", (s) => s + fill(`export const Ha__Name__ = headless(useHa__Name__, "Ha__Name__");\n`));

// Every fixture runs through the real mapper.
const fixtures = "src/ha/mappers/fixtures.test.ts";
edit(fixtures, afterLast(/^import \w+ from "\.\.\/fixtures\/.*$/gm, fill(`import __name__ from "../fixtures/__name__.json";\n`)));
edit(fixtures, afterLast(/^import \{ \w+FromHass \} from "\.\/.*$/gm, fill(`import { __name__FromHass } from "./__name__";\n`)));
edit(fixtures, before(/\n\];\n/, fill(`\n  { domain: "__label__", fixture: __name__, map: __name__FromHass, keepsState: ${!reading} },`)));

// The per-card spec, for the author to finish.
edit("docs/cards.md", before("## The dashboard header", fill(reading ? `## Using the __label__ card

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
edit("AGENTS.md", before(". Outside the cards", `, \`${code}-\` ${words}`));

// A card on the Lovelace dashboard. The domain picks it; when the domain already has a card, `card:` does.
const { path: lovelace, domainKind } = orbKinds();
const sharesDomain = domain in domainKind;
edit(lovelace, (s) => s.replace(/^(export type Kind = .*);$/m, `$1 | "${name}";`));
edit(lovelace, sharesDomain ? intoObject("SHARED_KINDS", `  ${name}: { domains: ["${domain}"] },`) : intoObject("DOMAIN_KIND", `  ${domain}: "${name}",`));
edit(lovelace, before("\n);\n\nexport type ItemConfig", `\n  | { kind: "${name}";${reading ? " unit?: string;" : ""} color?: ColorName | "none" }`));
edit(lovelace, intoObject("KIND_KEYS", `  ${name}: [${reading ? '"unit", ' : ""}"color"],`));
edit(lovelace, before("    }\n  }\n\n  cards(", `      case "${name}": return { ...base, kind,${reading ? ' unit: this.string(raw, "unit", at),' : ""} color: color() };\n`));
const renderer = `${SKIN}/lovelace/ConfigDashboard.tsx`;
edit(renderer, afterLast(/^import \{ Ha\w+Tile \} from "\.\.\/ha\/Ha\w+Tile";$/gm, fill(`import { Ha__Name__Tile } from "../ha/Ha__Name__Tile";\n`)));
edit(renderer, before("  }\n}\n\nfunction item(", fill(`    case "__name__": return <Ha__Name__Tile key={key} {...common} area={card.area}${reading ? " unit={card.unit}" : ""} color={card.color} />;\n`)));
// The automatic layout: a control on a domain of its own joins the compact controls per area.
const placed = !reading && !sharesDomain;
if (placed) {
  edit(`${SKIN}/lovelace/auto.ts`, (s) => s
    .replace(/const controls = ofDomain\(([^)]*)\);/, `const controls = ofDomain($1, "${domain}");`)
    .replace(/const order = \[([^\]]*)\];/, `const order = [$1, "${domain}"];`));
}
const deploy = "docs/deploy.md";
edit(deploy, afterLast(/^- `.*`: .*$/gm, `- \`${domain}\`${sharesDomain ? ` with \`card: ${name}\`` : ""}: ${words}\n`));
edit(deploy, (s) => s.replace(/^\| ([a-z0-9, ]+) \| `color` \|/m, `| $1, ${words} | \`color\` |`));
if (reading) edit(deploy, before("| bundle | `joined", `| ${words} | \`unit\` | The unit, when the entity doesn't say. |\n`));

// ---------- Write ----------
if (!change.commit(dryRun)) process.exit(0);

const created = [...writes.keys()].filter((p) => p.includes(`/${name}`) || p.includes(`${Name}`));
console.log(`Created the ${words} ${kind} card (${code}-, ${domain}.*): ${created.length} files, registered in ${writes.size - created.length} more.

Next:
  1. npm run storybook  →  Orb/Cards/${Name} and Orb/Connected/${Name}
  2. Make it the ${words}: fields in src/domains/${name}/types.ts, the card in ${Name}Card.tsx,
     attributes in src/ha/mappers/${name}.ts${reading ? "" : `, services in src/ha/actions/${name}.ts`}
  3. Draw its icon in ${SKIN}/cards/${name}/icons.tsx
  4. Finish "Using the ${words} card" in docs/cards.md
  5. Its Lovelace card: its YAML keys in ${SKIN}/lovelace/config.ts and docs/deploy.md${placed ? "" : `,
     and its place in the automatic layout, ${SKIN}/lovelace/auto.ts`}${sharesDomain ? `
     (${domain}.* already has a card, so a card picks this one with \`card: ${name}\`, or without it
     once its SHARED_KINDS entry has an \`id\` pattern for its entity ids, as owlet's does)` : ""}
  6. npm run check && npm run test-storybook`);

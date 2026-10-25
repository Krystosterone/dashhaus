/**
 * Scaffolds a widget that already follows the framework, Home Assistant side included:
 *
 *   npm run new-widget -- <name> --code <xx> --domain <ha_domain> [--kind control|reading] [--unit <unit>] [--dry-run]
 *   npm run new-widget -- fan --code fn --domain fan
 *   npm run new-widget -- co2 --code co --domain sensor --kind reading --unit ppm
 *
 * It copies ./templates/common plus ./templates/<kind> with the names filled in, then registers the widget
 * everywhere the conformance test (src/widgets/conformance.test.ts) looks, the Lovelace card included:
 *   - control (default): an on/off entity with an orb and a pill, over `<domain>.toggle`.
 *   - reading: a read-only number with a bare icon and a readout, no services.
 * Nothing is written unless every file and every registration can be made.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const templates = fileURLToPath(new URL("./templates/", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

const fail = (message) => {
  console.error(`new-widget: ${message}`);
  process.exit(1);
};

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
const code = flag("code");
const domain = flag("domain");
const kind = flag("kind") ?? "control";
const unit = flag("unit");
const [name, ...extra] = args;
const usage = "usage: npm run new-widget -- <name> --code <xx> --domain <ha_domain> [--kind control|reading] [--unit <unit>] [--dry-run]\n" +
  "       e.g. npm run new-widget -- fan --code fn --domain fan\n" +
  "            npm run new-widget -- co2 --code co --domain sensor --kind reading --unit ppm";
if (!name || !code || !domain || extra.length) fail(usage);
if (kind !== "control" && kind !== "reading") fail(`kind "${kind}" must be "control" (on/off, with services) or "reading" (read-only number)`);
if (unit != null && kind !== "reading") fail("--unit is for --kind reading");
const reading = kind === "reading";

// ---------- Validation ----------
if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) fail(`name "${name}" must be camelCase starting lower-case, like "fan" or "airPurifier"`);
if (existsSync(join(root, "src/widgets", name))) fail(`src/widgets/${name} already exists`);
// Names the dashboard stories already use as identifiers.
if (["cell", "columns", "section", "device", "bundle", "dashboardPage", "widgetGrid"].includes(name)) fail(`"${name}" is taken by the dashboard layout`);
if (!/^[a-z]{2}$/.test(code)) fail(`code "${code}" must be two lower-case letters: the widget's CSS class prefix`);
if (!/^[a-z][a-z0-9_]*$/.test(domain)) fail(`domain "${domain}" must be a Home Assistant domain, like "fan" or "input_boolean"`);

const agents = read("AGENTS.md");
const taken = new Set([...agents.matchAll(/`([a-z]{2})-`/g)].map((m) => m[1]));
for (const dir of readdirSync(join(root, "src/widgets")).filter((d) => statSync(join(root, "src/widgets", d)).isDirectory())) {
  for (const file of readdirSync(join(root, "src/widgets", dir)).filter((f) => f.endsWith("Widget.tsx"))) {
    const used = read(`src/widgets/${dir}/${file}`).match(/useCard\("([a-z]+)"/)?.[1];
    if (used) taken.add(used);
  }
}
if (taken.has(code)) fail(`code "${code}" is taken; in use: ${[...taken].sort().join(", ")}`);

// ---------- Names ----------
const Name = name[0].toUpperCase() + name.slice(1);
const words = name.replace(/([A-Z])/g, " $1").toLowerCase();
const tokens = {
  __Name__: Name,
  __name__: name,
  __CONST__: name.replace(/([A-Z])/g, "_$1").toUpperCase(),
  __Label__: words[0].toUpperCase() + words.slice(1),
  __label__: words,
  __code__: code,
  __domain__: domain,
  __unit__: unit ?? "%",
};
const fill = (text) => Object.entries(tokens).reduce((s, [token, value]) => s.replaceAll(token, value), text);

// ---------- Files from the template ----------
const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
};
/** path (relative to the repo) → content. The kind's own files win over common ones. */
const writes = new Map();
for (const base of ["common", kind].map((dir) => join(templates, dir))) {
  for (const source of walk(base)) {
    const target = fill(relative(base, source));
    if (existsSync(join(root, target))) fail(`${target} already exists`);
    writes.set(target, fill(readFileSync(source, "utf8")));
  }
}

// ---------- Registrations ----------
/** Change one file in place, failing loudly when the change finds nothing to anchor on. */
const edit = (path, change) => {
  const current = writes.get(path) ?? read(path);
  const next = change(current);
  if (next === current) fail(`could not register in ${path}: its anchor moved. Update scripts/new-widget/index.mjs`);
  writes.set(path, next);
};
const before = (anchor, text) => (s) => {
  const i = typeof anchor === "string" ? s.indexOf(anchor) : s.search(anchor);
  return i === -1 ? s : s.slice(0, i) + text + s.slice(i);
};
const afterLast = (pattern, text) => (s) => {
  const matches = [...s.matchAll(pattern)];
  const last = matches.at(-1);
  if (!last) return s;
  const end = s.indexOf("\n", last.index) + 1;
  return s.slice(0, end) + text + s.slice(end);
};

// Public exports: the widget, its tile, its types and its connected tile.
edit("src/index.ts", before('export { JoinedBundle, LeadBundle, TitledBundle } from "./bundles/Bundle";', fill(`// __Label__
export { __Name__Widget, __Name__Sheet } from "./widgets/__name__/__Name__Widget";
export type { __Name__WidgetProps, __Name__SheetProps } from "./widgets/__name__/__Name__Widget";
export { __Name__Tile } from "./widgets/__name__/__Name__Tile";
export type { __Name__TileProps } from "./widgets/__name__/__Name__Tile";
export type { __Name__Entity, __Name__History } from "./widgets/__name__/types";
export { Ha__Name__Tile } from "./ha";
export type { Ha__Name__TileProps } from "./ha";

`)));

edit("src/ha/index.ts", (s) => s + fill(`export { __name__FromHass } from "./mappers/__name__";
export type { __Name__MapOptions } from "./mappers/__name__";
${reading ? "" : `export { create__Name__Handlers } from "./actions/__name__";
export type { __Name__Handlers, __Name__HandlerOptions } from "./actions/__name__";
`}export { Ha__Name__Tile } from "./Ha__Name__Tile";
export type { Ha__Name__TileProps } from "./Ha__Name__Tile";
`));

// Every fixture runs through the real mapper.
const fixtures = "src/ha/mappers/fixtures.test.ts";
edit(fixtures, afterLast(/^import \w+ from "\.\.\/fixtures\/.*$/gm, fill(`import __name__ from "../fixtures/__name__.json";\n`)));
edit(fixtures, afterLast(/^import \{ \w+FromHass \} from "\.\/.*$/gm, fill(`import { __name__FromHass } from "./__name__";\n`)));
edit(fixtures, before(/\n\];\n/, fill(`\n  { domain: "__label__", fixture: __name__, map: __name__FromHass, keepsState: ${!reading} },`)));

// On a dashboard: a control as a compact row in the phone's Quick actions section, a reading beside the room sensors.
// Move it where it belongs; this only puts it on screen.
const dashboards = "src/dashboards/Dashboards.stories.tsx";
edit(dashboards, afterLast(/^import \{ Demo\w+Tile as \w+ \} from "\.\.\/widgets\/.*$/gm, fill(`import { Demo__Name__Tile as __Name__ } from "../widgets/__name__/demo/Demo__Name__Tile";\n`)));
edit(dashboards, (s) => {
  const start = s.indexOf(reading ? '<Section title="Rooms" columns={2}>' : '<Section title="Quick actions" columns={2}>');
  const end = start === -1 ? -1 : s.indexOf("</Section>", start);
  if (end === -1) return s;
  const indent = s.slice(s.lastIndexOf("\n", end) + 1, end);
  return s.slice(0, end) + fill(reading ? `  <__Name__ seed="normal" />\n` : `  <__Name__ seed="on" footprint="compact" />\n`) + indent + s.slice(end);
});

// The per-widget spec, for the author to finish.
edit("docs/widgets.md", before("## Using the header widget", fill(reading ? `## Using the __label__ widget

One \`__domain__.*\` reading:

\`\`\`tsx
<__Name__Tile entity={entity} history={today} />
<Ha__Name__Tile entityId="__domain__.living_room" />
\`\`\`

- **A reading:** a bare icon, the figure as a readout with no container, and no glow. Tap the reading or the name for the sheet.
- **Status line:** the area.
- **Unavailable:** \`unknown\`, \`unavailable\` and a missing entity say Unavailable and hide the last value; a state that isn't a number is "No reading yet".
- **Featured and sheet:** today's readings by hour, with the low and the high.

` : `## Using the __label__ widget

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
edit("AGENTS.md", before("`hb-` bundles", `\`${code}-\` ${words}, `));

// A card on the Lovelace dashboard. The domain picks it; when the domain already has a widget, `widget:` does.
const lovelace = "src/ha/lovelace/config.ts";
/** Add a line at the end of a top-level `const <name> … = { … };` object. */
const intoObject = (constName, line) => (s) => s.replace(new RegExp(`(const ${constName}\\b[^{]*\\{[\\s\\S]*?)(\\n\\};)`), `$1\n${line}$2`);
const domainKinds = read(lovelace).match(/const DOMAIN_KIND\b[^{]*\{([\s\S]*?)\n\};/)?.[1];
if (domainKinds == null) fail(`could not find DOMAIN_KIND in ${lovelace}. Update scripts/new-widget/index.mjs`);
const sharesDomain = new RegExp(`^\\s*${domain}:`, "m").test(domainKinds);
edit(lovelace, (s) => s.replace(/^(export type Kind = .*);$/m, `$1 | "${name}";`));
edit(lovelace, sharesDomain ? intoObject("SHARED_KINDS", `  ${name}: { domains: ["${domain}"] },`) : intoObject("DOMAIN_KIND", `  ${domain}: "${name}",`));
edit(lovelace, before("\n);\n\nexport type ItemConfig", `\n  | { kind: "${name}";${reading ? " unit?: string;" : ""} color?: ColorName | "none" }`));
edit(lovelace, intoObject("KIND_KEYS", `  ${name}: [${reading ? '"unit", ' : ""}"color"],`));
edit(lovelace, before("    }\n  }\n\n  cards(", `      case "${name}": return { ...base, kind,${reading ? ' unit: this.string(raw, "unit", at),' : ""} color: color() };\n`));
const renderer = "src/ha/lovelace/ConfigDashboard.tsx";
edit(renderer, afterLast(/^import \{ Ha\w+Tile \} from "\.\.\/Ha\w+Tile";$/gm, fill(`import { Ha__Name__Tile } from "../Ha__Name__Tile";\n`)));
edit(renderer, before("  }\n}\n\nfunction item(", fill(`    case "__name__": return <Ha__Name__Tile key={key} {...common} area={card.area}${reading ? " unit={card.unit}" : ""} color={card.color} />;\n`)));
// The automatic layout: a control on a domain of its own joins the compact controls per area.
const placed = !reading && !sharesDomain;
if (placed) {
  edit("src/ha/lovelace/auto.ts", (s) => s
    .replace(/const controls = ofDomain\(([^)]*)\);/, `const controls = ofDomain($1, "${domain}");`)
    .replace(/const order = \[([^\]]*)\];/, `const order = [$1, "${domain}"];`));
}
const deploy = "docs/deploy.md";
edit(deploy, afterLast(/^- `.*`: .*$/gm, `- \`${domain}\`${sharesDomain ? ` with \`widget: ${name}\`` : ""}: ${words}\n`));
edit(deploy, (s) => s.replace(/^\| ([a-z, ]+) \| `color` \|/m, `| $1, ${words} | \`color\` |`));
if (reading) edit(deploy, before("| bundle | `joined", `| ${words} | \`unit\` | The unit, when the entity doesn't say. |\n`));

// ---------- Write ----------
if (dryRun) {
  for (const path of [...writes.keys()].sort()) console.log(`${existsSync(join(root, path)) ? "edit  " : "create"} ${path}`);
  process.exit(0);
}
for (const [path, content] of writes) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

const created = [...writes.keys()].filter((p) => p.includes(`/${name}`) || p.includes(`${Name}`));
console.log(`Created the ${words} ${kind} widget (${code}-, ${domain}.*): ${created.length} files, registered in ${writes.size - created.length} more.

Next:
  1. npm run storybook  →  Widgets/${Name} and Home Assistant/${tokens.__Label__} tile
  2. Make it the ${words}: fields in src/widgets/${name}/types.ts, the card in ${Name}Widget.tsx,
     attributes in src/ha/mappers/${name}.ts${reading ? "" : `, services in src/ha/actions/${name}.ts`}
  3. Draw its icon in src/widgets/${name}/icons.tsx; move it to the right section in src/dashboards/Dashboards.stories.tsx
  4. Finish "Using the ${words} widget" in docs/widgets.md
  5. Its Lovelace card: its YAML keys in src/ha/lovelace/config.ts and docs/deploy.md${placed ? "" : `,
     and its place in the automatic layout, src/ha/lovelace/auto.ts`}${sharesDomain ? `
     (${domain}.* already has a widget, so a card picks this one with \`widget: ${name}\`, or without it
     once its SHARED_KINDS entry has an \`id\` pattern for its entity ids, as owlet's does)` : ""}
  6. npm run check && npm run test-storybook`);

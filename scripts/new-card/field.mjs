/**
 * Draws a domain that already exists in the field skin:
 *
 *   npm run new-card -- <name> --skin field [--kind control|reading] [--code <xx>] [--dry-run]
 *   npm run new-card -- owlet --skin field --kind reading
 *
 * The domain, its `useHa<Name>` hook and its orb card come first; this reads them and draws only field's side
 * (AGENTS.md → Adding an existing domain to another skin). It copies ./templates/field/common plus
 * ./templates/field/<kind>, copies orb's demo seeds into the card's own demo/ (a skin never imports another), and
 * registers the module everywhere verify/field-conformance.test.ts looks, the Lovelace card included:
 *   - control: one key over the handlers' `onToggle`, its LED on while the entity is "on". The default when the
 *     domain has actions.
 *   - reading: the glyph on a flat plate and today's meter, nothing pressed. The default when it has none.
 * Nothing is written unless every file and every registration can be made.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { markers, packageFile, packageSpecifier } from "../packages.mjs";
import { after, before, changes, exists, fail, filler, names, orbKinds, read, root, seams, skinDir } from "./lib.mjs";

const SKIN = skinDir("field");
const ORB = skinDir("orb");

/** The body of `export interface <name> { … }` (or a one-line `type <name> = { … }`) in a source file. */
const shape = (source, name) => source.match(new RegExp(`(?:interface|type) ${name}\\b[^{]*\\{([\\s\\S]*?)\\n?\\}`))?.[1];

/** The body of a top-level `export const <name> … = { … }` object, up to its closing brace at the margin. */
const objectBody = (source, name) => source.match(new RegExp(`export const ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`))?.[1];

export function newFieldCard({ name, kind: askedKind, code: askedCode, dryRun }) {
  // ---------- What the domain already has ----------
  const { Name, CONST, words, Label } = names(name, '"sound"');
  const step = (n) => `AGENTS.md → Adding an existing domain to another skin, step ${n}`;

  if (exists(`${SKIN}/cards/${name}`)) fail(`${SKIN}/cards/${name} already exists`);
  const typesPath = packageFile("core", `src/entities/${name}/types.ts`);
  if (!exists(typesPath)) fail(`${typesPath} doesn't exist. Field draws a domain orb already has: npm run new-card -- ${name} --code <xx> --domain <ha_domain> first`);
  const types = read(typesPath);
  const entity = shape(types, `${Name}Entity`);
  const history = shape(types, `${Name}History`);
  if (!entity || !history) fail(`${typesPath} must export ${Name}Entity and ${Name}History`);

  const hookPath = packageFile("core", `src/ha/hooks/${name}.ts`);
  if (!exists(hookPath)) fail(`${hookPath} doesn't exist: field reaches Home Assistant through useHa${Name} (${step(1)})`);
  const hook = read(hookPath);
  const options = shape(hook, `Ha${Name}Options`);
  if (!new RegExp(`export function useHa${Name}\\b`).test(hook) || options == null) fail(`${hookPath} must export useHa${Name} and Ha${Name}Options`);
  const required = [...options.matchAll(/^\s+(\w+): /gm)].map((m) => m[1]);
  if (required.length) fail(`useHa${Name} requires ${required.join(", ")}, which a generated module can't know. Draw ${words} in field by hand, from ${SKIN}/cards/light/`);

  const actionsPath = packageFile("core", `src/ha/actions/${name}.ts`);
  const handlers = exists(actionsPath) ? shape(read(actionsPath), `${Name}Handlers`) ?? "" : null;
  const kind = askedKind ?? (handlers == null ? "reading" : "control");
  if (kind !== "control" && kind !== "reading") fail(`kind "${kind}" must be "control" or "reading"`);
  if (kind === "control") {
    if (handlers == null) fail(`${words} has no actions (${actionsPath}), so it can only be a reading`);
    if (!/^\s+onToggle: /m.test(handlers)) {
      const names = [...handlers.matchAll(/^\s+(on\w+)\??: /gm)].map((m) => m[1]).join(", ");
      fail(`${Name}Handlers (${names}) has no onToggle, the one key a generated control drives. Pass --kind reading for a read-only start and add its keys by hand, or draw it from ${SKIN}/cards/light/`);
    }
    if (!/^\s+state: [^;]*"on"/m.test(entity)) fail(`${Name}Entity's state has no "on" for its key's LED. Draw ${words} in field by hand`);
  }

  // ---------- Orb's card: its code, its seeds, its connected story ----------
  const orbDir = `${ORB}/cards/${name}`;
  if (!exists(orbDir)) fail(`${orbDir} doesn't exist: field copies its demo seeds and card code from orb's card`);
  const fieldCodes = readdirSync(join(root, SKIN, "cards")).map((d) => exists(`${SKIN}/cards/${d}/${d[0].toUpperCase()}${d.slice(1)}Module.tsx`) && read(`${SKIN}/cards/${d}/${d[0].toUpperCase()}${d.slice(1)}Module.tsx`).match(/<ModuleFrame\s+kind="fd-([a-z]{2})"/)?.[1]).filter(Boolean);
  const code = askedCode ?? (exists(`${orbDir}/${Name}Card.tsx`) ? read(`${orbDir}/${Name}Card.tsx`).match(/useCard\("([a-z]{2})"/)?.[1] : undefined);
  if (!code || !/^[a-z]{2}$/.test(code)) fail(`no card code: pass --code <xx>, two lower-case letters for its fd-<xx>- classes`);
  if (fieldCodes.includes(code)) fail(`fd-${code}- is taken; in use: ${fieldCodes.map((c) => `fd-${c}-`).join(", ")}. Pass --code <xx>`);

  const demoDir = `${orbDir}/demo`;
  const seedFile = exists(demoDir) && readdirSync(join(root, demoDir)).find((f) => /\.ts$/.test(f) && new RegExp(`export const ${CONST}_SEEDS\\b`).test(read(`${demoDir}/${f}`)));
  if (!seedFile) fail(`${demoDir} has no .ts file exporting ${CONST}_SEEDS to copy`);
  let seeds = read(`${demoDir}/${seedFile}`);
  for (const needed of [`${CONST}_WORST_CASE`, `${Name}Seed`, `${Name}SeedName`]) {
    if (!new RegExp(`export (const|interface|type) ${needed}\\b`).test(seeds)) fail(`${demoDir}/${seedFile} must export ${needed}`);
  }
  // Same depth in both skins, so a path to src/ stays right; orb's own modules can't come along.
  seeds = seeds.replace(/^import (type )?\{([^}]*)\} from "(\.[^"]+)";$/gm, (line, isType, list, path) => {
    if (path.startsWith("../../../../../")) return line;
    const imported = list.split(",").map((n) => n.trim()).filter(Boolean);
    if (path === "../../../shared/ui" && isType && imported.every((n) => ["HourSample", "Reading"].includes(n))) return `import type {${list}} from "${packageSpecifier("core", "entities/history")}";`;
    fail(`${demoDir}/${seedFile} imports ${path}, which is orb's own; move what it needs to ${packageFile("core", "src/entities")}/ first`);
  });
  seeds = `// Copied from orb's card by \`npm run new-card -- ${name} --skin field\`: field's own seeds from here.\n${seeds}`;
  const hasHook = new RegExp(`export function useDemo${Name}\\b`).test(seeds);
  if (kind === "control" && !hasHook) fail(`${demoDir}/${seedFile} has no useDemo${Name} for a control's stories to press`);
  if (!hasHook && !/\bhistory\b/.test(shape(seeds, `${Name}Seed`) ?? "")) fail(`${Name}Seed has no history and there is no useDemo${Name} to make one`);

  const seedBody = objectBody(seeds, `${CONST}_SEEDS`) ?? "";
  const seedKeys = [...seedBody.matchAll(/^ {2}(\w+): /gm)].map((m) => ({ key: m[1], index: m.index }));
  const seedText = (i) => seedBody.slice(seedKeys[i].index, seedKeys[i + 1]?.index);
  const unavailableSeed = seedKeys.find((_, i) => /state: "unavailable"/.test(seedText(i)))?.key;
  const firstSeed = seedKeys.find((_, i) => !/state: "unavailable"/.test(seedText(i)))?.key;
  if (!unavailableSeed || !firstSeed) fail(`${CONST}_SEEDS needs an unavailable example and an available one, for the Unavailable and default stories`);

  const orbStory = exists(`${ORB}/ha/Ha${Name}Tile.stories.tsx`) ? read(`${ORB}/ha/Ha${Name}Tile.stories.tsx`) : "";
  const transport = orbStory.match(/import \{ (createDemo\w+HaTransport)\b[^}]*\} from "(@dashhaus\/core\/demo)"/);
  const entityId = orbStory.match(/entityId="([^"]+)"/)?.[1];
  if (!transport || !entityId) fail(`${ORB}/ha/Ha${Name}Tile.stories.tsx must import a createDemo…HaTransport and draw an entityId, for field's connected story`);

  const fixturePath = packageFile("core", `src/ha/fixtures/${name}.json`);
  if (!exists(fixturePath)) fail(`${fixturePath} doesn't exist, for its connected module's test`);
  const fixtureId = Object.entries(JSON.parse(read(fixturePath))).find(([, e]) => !["unavailable", "unknown"].includes(e.state))?.[0];
  if (!fixtureId) fail(`${fixturePath} has no available entity for its connected module's test`);

  // The Home Assistant domains it draws, as orb's Lovelace card has them.
  const orb = orbKinds();
  const shared = orb.shared[name];
  const domains = shared?.domains ?? Object.keys(orb.domainKind).filter((d) => orb.domainKind[d] === name);
  if (!domains.length) fail(`${orb.path} gives ${name} no domain in DOMAIN_KIND or SHARED_KINDS`);

  // ---------- Files from the templates ----------
  const fill = filler({
    __DEMO__: hasHook ? `useDemo${Name}(seed)` : "seed",
    __demoImport__: hasHook ? `, useDemo${Name}` : "",
    // A control's one press, in its stories and from its hook's actions; a line of its own, gone for a reading.
    __demoProps__: kind === "control" ? "onToggle={demo.onToggle}" : "",
    __liveProps__: kind === "control" ? "onToggle={actions.onToggle}" : "",
    __actions__: kind === "control" ? ", actions" : "",
    __about__: kind === "control"
      ? "Press the key to switch it; its LED is lit while it's on. Tap the name, or press and hold the key, for the detail panel with today."
      : "A reading, so nothing on it is pressed: its glyph lies flat where a key would be, and today's meter takes the fader's place. Tap the name for the detail panel.",
    __areaProp__: /^\s+area\?: /m.test(entity) ? " area={e.area}" : "",
    // Since when it has been as it is, on the screen and in the panel's facts, where the entity says.
    __meta__: /^\s+lastChanged\??: /m.test(entity) ? "e.lastChanged ? [`Since ${e.lastChanged}`] : undefined" : "undefined",
    __changed__: /^\s+lastChanged\??: /m.test(entity) ? "e.lastChanged ? `Last changed ${e.lastChanged}` : \"\"" : "\"\"",
    // Today's meter, from the history's hourly samples where it has them; dark until the author wires it otherwise.
    __samplesProp__: /^\s+samples: /m.test(history) ? "samples={history?.samples}" : "",
    __testProps__: kind === "control" ? "onToggle={onToggle}" : "",
    __seedFile__: seedFile.replace(/\.ts$/, ""),
    __firstSeed__: firstSeed,
    __unavailableSeed__: unavailableSeed,
    __transport__: transport[1],
    __transportPath__: transport[2],
    __entityId__: entityId,
    __fixtureId__: fixtureId,
    __Name__: Name,
    __name__: name,
    __CONST__: CONST,
    __Label__: Label,
    __label__: words,
    __code__: code,
  });
  const change = changes();
  const { edit } = change;
  change.fromTemplates(["field/common", `field/${kind}`], fill);
  change.create(`${SKIN}/cards/${name}/demo/${seedFile}`, seeds);

  // ---------- Registrations ----------
  edit(`${SKIN}/index.ts`, after(markers.skinCards, fill(`export { __Name__Module } from "./cards/__name__/__Name__Module";
export type { __Name__ModuleProps } from "./cards/__name__/__Name__Module";
export { Ha__Name__Module } from "./ha/Ha__Name__Module";
export type { Ha__Name__ModuleProps } from "./ha/Ha__Name__Module";
`)));

  // Storybook: its place in Field's Cards and Connected, and on the Design rules page under its section.
  edit(seams.preview, (s) => {
    const at = s.indexOf('"Field", [');
    if (at === -1) return s;
    const field = s.slice(at);
    const insert = (marker) => after(marker, `              "${Name}",\n`);
    return s.slice(0, at) + insert(markers.previewConnected)(insert(markers.previewCards)(field));
  });
  const rules = `${SKIN}/stories/DesignRules.mdx`;
  edit(rules, after(markers.designRuleImports, `import * as ${Name} from "../cards/${name}/${Name}Module.stories";\n`));
  edit(rules, after(markers.designRuleStories, `    ${/\s/.test(Label) ? `"${Label}"` : Label}: [${Name}.AllStates, ${Name}.Footprints],`));

  // Its spec, for the author to finish.
  edit(seams.fieldDoc, (s) => `${s.trimEnd()}\n\n## ${Label}\n\n${kind === "control"
    ? `- **Module:** the key switches it and its LED says on; the screen says ON or OFF. Compact: key, name and area, screen.\n- **Panel:** the screen, the key and today.\n`
    : `- **Module:** a reading: its glyph on a flat plate and today's meter. The screen's figure is blank until it is given its reading; the meta line says the state. Compact: glyph, name and area, screen.\n- **Panel:** the screen and today.\n`}- **Unavailable:** blank segments and when it was last seen${kind === "control" ? "; the key lies flat" : ""}.\n`);
  edit(seams.cardsDoc, (s) => {
    const at = s.indexOf(`## Using the ${words} card`);
    if (at === -1) return s;
    const next = s.indexOf("\n## ", at + 1);
    const end = next === -1 ? s.length : next + 1;
    return `${s.slice(0, end).trimEnd()}\n\n### Field ${words} module\n\n\`${Name}Module\` is the same normalized ${words} entity in the Field skin; \`Ha${Name}Module\` is its connected container, on the same \`useHa${Name}\` hook as \`Ha${Name}Tile\`. See [field.md](field.md#${words.replace(/ /g, "-")}).\n\n${s.slice(end)}`;
  });
  edit(seams.agents, before(markers.fieldCodes, `, \`fd-${code}-\` for ${words}`));

  // The Lovelace card: its domains, and its connected module.
  const config = seams.field.config;
  edit(config, after(markers.kinds, `  | "${name}"\n`));
  edit(config, after(markers.fieldKinds, `  ${name}: { domains: [${domains.map((d) => `"${d}"`).join(", ")}]${shared?.id ? `, id: ${shared.id}` : ""} },`));
  const dashboard = seams.field.dashboard;
  edit(dashboard, after(markers.moduleImports, `import { Ha${Name}Module } from "../ha/Ha${Name}Module";\n`));
  // The module's own name and area, where the hook takes them.
  const passed = ["name", "area"].filter((key) => new RegExp(`^\\s+${key}\\?: `, "m").test(options)).map((key) => ` ${key}={item.${key}}`).join("");
  edit(dashboard, after(markers.liveModules, `  ${name}: (item, footprint) => <Ha${Name}Module entityId={item.entity}${passed} footprint={footprint} />,`));
  const listed = read(seams.deployDoc).match(/^\| `modules` \| a list of ([^|]*?) entity ids/m)?.[1] ?? "";
  if (domains.some((d) => !listed.includes(`\`${d}.*\``))) edit(seams.deployDoc, (s) => s.replace(/^(\| `modules` \| a list of )([^|]*?)( entity ids)/m, (_, head, list, tail) => {
    const all = [...new Set([...[...list.matchAll(/`(\w+)\.\*`/g)].map((m) => m[1]), ...domains])].map((d) => `\`${d}.*\``);
    return `${head}${all.slice(0, -1).join(", ")} or ${all.at(-1)}${tail}`;
  }));

  // ---------- Write ----------
  if (!change.commit(dryRun)) return;
  console.log(`Drew ${words} in field as a ${kind} (fd-${code}-, ${domains.map((d) => `${d}.*`).join(", ")}): seeds copied from ${demoDir}/${seedFile}.

Next:
  1. npm run storybook  →  Field/Cards/${Name} and Field/Connected/${Name}
  2. Make it the ${words}: its screen and ${kind === "control" ? "panel controls" : "figure"} in ${SKIN}/cards/${name}/${Name}Module.tsx (docs/field.md → Design rules)
  3. Draw its glyph and pictogram in ${SKIN}/cards/${name}/icons.tsx
  4. Finish "## ${Label}" in docs/field.md and "### Field ${words} module" in docs/cards.md,
     and name ${words} where docs/field.md and docs/deploy.md list what field draws${shared ? `
  5. ${domains.join(", ")} already has a field card, so a module picks this one with \`card: ${name}\`` : ""}
  ${shared ? 6 : 5}. npm run check && npm run test-storybook`);
}

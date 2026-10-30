/** Add one existing shared domain to a neutral skin created by `new-skin`. */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { generated as generatedSkin, markers, packageFile, packageSpecifier, seams } from "../packages.mjs";
import { after, changes, exists, fail, filler, names, orbKinds, read, root, skinDir } from "./lib.mjs";

const shape = (source, name) => source.match(new RegExp(`(?:interface|type) ${name}\\b[^{]*\\{([\\s\\S]*?)\\n?\\}`))?.[1];
const objectBody = (source, name) => source.match(new RegExp(`export const ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`))?.[1];
const wordsOf = (name) => name.replace(/^on/, "").replace(/([A-Z])/g, " $1").trim().toLowerCase();
const labelOf = (name) => { const words = wordsOf(name).replace(/ cover$/, ""); return words[0].toUpperCase() + words.slice(1); };
const skinNames = (skin) => {
  const parts = skin.split("-");
  return {
    Skin: parts.map((part) => part[0].toUpperCase() + part.slice(1)).join(""),
    Section: parts.map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
    skinVar: parts[0] + parts.slice(1).map((part) => part[0].toUpperCase() + part.slice(1)).join(""),
    SKIN_CONST: parts.join("_").toUpperCase(),
  };
};

const summaryFor = (entity) => {
  const has = (field) => new RegExp(`^\\s+${field}\\??: `, "m").test(entity);
  if (has("temperature") && has("unit")) return 'e.temperature == null ? stateWords(e.state) : `${e.temperature}${e.unit}`';
  if (has("temperature") && has("temperatureUnit")) return 'e.temperature == null ? stateWords(e.state) : `${e.temperature}${e.temperatureUnit}`';
  if (has("currentTemperature") && has("unit")) return 'e.currentTemperature == null ? stateWords(e.state) : `${e.currentTemperature}${e.unit}`';
  if (has("currentHumidity")) return 'e.currentHumidity == null ? stateWords(e.state) : `${e.currentHumidity}%`';
  if (has("heartRate")) return 'e.heartRate == null ? stateWords(e.state) : `${e.heartRate} bpm`';
  if (has("position")) return 'e.position == null ? stateWords(e.state) : `${e.position}%`';
  if (has("volume")) return 'e.volume == null ? stateWords(e.state) : `${e.volume}%`';
  if (has("brightness")) return 'e.brightness == null ? stateWords(e.state) : `${e.brightness}%`';
  if (has("targetHumidity")) return 'e.targetHumidity == null ? stateWords(e.state) : `${e.targetHumidity}%`';
  return "stateWords(e.state)";
};

/** Plan or write one Card in a generated skin. A supplied transaction lets another generator validate the whole operation before writing. */
export function newGeneratedCard({ skin, name, kind: askedKind, dryRun, change: suppliedChange }) {
  const { Name, CONST, words, Label } = names(name, '"light"');
  const { Skin, Section, skinVar, SKIN_CONST } = skinNames(skin);
  const SKIN = generatedSkin.dir(skin);
  const registryPath = generatedSkin.file(skin, generatedSkin.files.registry);
  const change = suppliedChange ?? changes();
  if (!change.exists(generatedSkin.file(skin, generatedSkin.files.manifest))) fail(`${skin} is not a generated skin package: ${generatedSkin.file(skin, generatedSkin.files.manifest)} is missing. Start it with npm run new-skin -- ${skin}`);
  if (!change.exists(registryPath)) fail(`${skin} is not a generated skin: ${registryPath} is missing. Start it with npm run new-skin -- ${skin}`);
  if (change.exists(`${SKIN}/cards/${name}`)) fail(`${SKIN}/cards/${name} already exists`);

  const typesPath = packageFile("core", `src/entities/${name}/types.ts`);
  if (!exists(typesPath)) fail(`${typesPath} doesn't exist. A generated skin draws a shared domain that already exists`);
  const types = read(typesPath);
  const entity = shape(types, `${Name}Entity`);
  const history = shape(types, `${Name}History`);
  if (!entity || !history) fail(`${typesPath} must export ${Name}Entity and ${Name}History`);

  const hookPath = packageFile("core", `src/ha/hooks/${name}.ts`);
  if (!exists(hookPath)) fail(`${hookPath} doesn't exist: generated skins reach Home Assistant through useHa${Name}`);
  const hook = read(hookPath);
  const options = shape(hook, `Ha${Name}Options`);
  if (!new RegExp(`export function useHa${Name}\\b`).test(hook) || options == null) fail(`${hookPath} must export useHa${Name} and Ha${Name}Options`);
  const required = [...options.matchAll(/^\s+(\w+): /gm)].map((match) => match[1]);
  if (required.length) fail(`useHa${Name} requires ${required.join(", ")}, which a generated Card can't know`);

  const actionsPath = packageFile("core", `src/ha/actions/${name}.ts`);
  const handlers = exists(actionsPath) ? shape(read(actionsPath), `${Name}Handlers`) ?? "" : "";
  const zeroArg = [...handlers.matchAll(/^\s+(on\w+)\??:\s*\(\)\s*=>/gm)].map((match) => match[1]);
  const kind = askedKind ?? (zeroArg.length ? "control" : "reading");
  if (kind !== "control" && kind !== "reading") fail(`kind "${kind}" must be "control" or "reading"`);
  if (kind === "control" && !zeroArg.length) fail(`${Name}Handlers has no zero-argument action a neutral Card can expose. Use --kind reading`);
  const actions = kind === "control" ? zeroArg : [];

  const orbDir = `${skinDir("orb")}/cards/${name}`;
  const demoDir = `${orbDir}/demo`;
  if (!exists(demoDir)) fail(`${demoDir} doesn't exist: generated skins copy skin-independent demo seeds from Orb`);
  const candidates = readdirSync(join(root, demoDir)).filter((file) => file.endsWith(".ts"));
  const seedFile = candidates.find((file) => /export const \w*SEEDS\s*=/.test(read(`${demoDir}/${file}`)));
  if (!seedFile) fail(`${demoDir} has no .ts file exporting a SEEDS object`);
  let seeds = read(`${demoDir}/${seedFile}`);
  const seedConst = seeds.match(/export const (\w*SEEDS)\s*=/)?.[1];
  const worstConst = seeds.match(new RegExp(`export const (${CONST}_WORST_CASE)\\b`))?.[1];
  const seedType = seeds.match(/satisfies Record<string,\s*(\w+)>/)?.[1] ?? seeds.match(/export (?:interface|type) (\w*Seed)\b/)?.[1];
  const seedNameType = seeds.match(/export type (\w*SeedName|SeedName)\b/)?.[1];
  if (!seedConst || !worstConst || !seedType || !seedNameType) fail(`${demoDir}/${seedFile} must export seeds, a seed type, its key type and ${CONST}_WORST_CASE`);
  seeds = seeds.replace(/^import (type )?\{([^}]*)\} from "(\.[^"]+)";$/gm, (line, isType, list, path) => {
    if (path.startsWith("../../../../../")) return line;
    const imported = list.split(",").map((item) => item.trim()).filter(Boolean);
    if (path === "../../../shared/ui" && isType && imported.every((item) => ["HourSample", "Reading"].includes(item))) return `import type {${list}} from "${packageSpecifier("core", "entities/history")}";`;
    fail(`${demoDir}/${seedFile} imports ${path}, which belongs to Orb; move what it needs to a shared module first`);
  });
  seeds = `// Copied from Orb by \`npm run new-card -- ${name} --skin ${skin}\`; this skin owns its Seeds from here.\n${seeds}`;
  const hasHook = new RegExp(`export function useDemo${Name}\\b|export \\{ useDemo${Name} \\}`).test(seeds);
  const seedBody = objectBody(seeds, seedConst) ?? "";
  const seedKeys = [...seedBody.matchAll(/^ {2}(\w+): /gm)].map((match) => ({ key: match[1], index: match.index }));
  const seedEntries = seedKeys.map((entry, index) => ({ ...entry, text: seedBody.slice(entry.index, seedKeys[index + 1]?.index) }));
  const unavailableSeed = seedEntries.find((entry) => /state:\s*"unavailable"/.test(entry.text))?.key;
  const firstSeed = seedEntries.find((entry) => !/state:\s*"unavailable"/.test(entry.text))?.key;
  if (!unavailableSeed || !firstSeed) fail(`${seedConst} needs available and unavailable examples`);
  if (!hasHook && !/\bhistory\s*:/.test(shape(seeds, seedType) ?? "")) fail(`${seedType} needs history when it has no useDemo${Name}`);

  const orbStoryPath = `${skinDir("orb")}/ha/Ha${Name}Tile.stories.tsx`;
  const orbStory = exists(orbStoryPath) ? read(orbStoryPath) : "";
  const transport = orbStory.match(/import \{ (createDemo\w*HaTransport)\b[^}]*\} from "(@scope\/core\/demo)"/);
  const entityId = orbStory.match(/entityId="([^"]+)"/)?.[1];
  if (!transport || !entityId) fail(`${orbStoryPath} must import a demo transport and draw an entityId`);
  const fixturePath = packageFile("core", `src/ha/fixtures/${name}.json`);
  if (!exists(fixturePath)) fail(`${fixturePath} doesn't exist`);
  const fixtureId = Object.entries(JSON.parse(read(fixturePath))).find(([, value]) => !["unavailable", "unknown"].includes(value.state))?.[0];
  if (!fixtureId) fail(`${fixturePath} has no available entity`);

  const orb = orbKinds();
  const shared = orb.shared[name];
  const domains = shared?.domains ?? Object.keys(orb.domainKind).filter((domain) => orb.domainKind[domain] === name);
  if (!domains.length) fail(`${orb.path} gives ${name} no Home Assistant domain`);

  const actionProps = actions.map((action) => `  ${action}?: () => void;`).join("\n");
  const actionArgs = actions.map((action) => `, ${action}`).join("");
  const actionRows = actions.map((action) => {
    const pressed = action === "onToggle" ? ' pressed={e.state !== "off" && e.state !== "unavailable"}' : action === "onBaseToggle" ? ' {...("baseOn" in e ? { pressed: e.baseOn === true } : {})}' : "";
    return `      {${action} && <${Skin}Action label="${labelOf(action)}"${pressed} unavailable={unavailable} onPress={${action}} />}`;
  }).join("\n");
  const demoProps = hasHook ? actions.map((action) => ` ${action}={demo.${action}}`).join("") : "";
  const liveProps = actions.map((action) => ` ${action}={result.actions.${action}}`).join("");
  const actionImport = actions.length ? `${Skin}Action, ` : "";
  const unavailableConst = actions.length ? '  const unavailable = e.state === "unavailable";' : "";
  const actionsBlock = actions.length ? `  const actions = (
    <>
${actionRows}
    </>
  );` : "";
  const actionsProp = actions.length ? ` actions={${actions.join(" || ")} ? actions : undefined}` : "";
  const commonLive = ["name", "area"].filter((key) => new RegExp(`^\\s+${key}\\?: `, "m").test(options)).map((key) => ` ${key}={item.${key}}`).join("") + (/^\s+loadHistory\?: /m.test(options) ? " loadHistory={item.history}" : "");

  const fill = filler({
    __skin__: skin, __Skin__: Skin, __skinVar__: skinVar, __Section__: Section, __SKIN_CONST__: SKIN_CONST,
    __Name__: Name, __name__: name, __CONST__: CONST, __Label__: Label, __label__: words,
    __actionProps__: actionProps, __actionArgs__: actionArgs, __actionImport__: actionImport,
    __unavailableConst__: unavailableConst, __actionsBlock__: actionsBlock, __actionsProp__: actionsProp,
    __summary__: summaryFor(entity), __demoProps__: demoProps, __liveProps__: liveProps,
    __DEMO__: hasHook ? `useDemo${Name}(seed)` : "seed", __demoImport__: hasHook ? `, useDemo${Name}` : "",
    __testProps__: "", __seedConst__: seedConst, __worstConst__: worstConst, __seedType__: seedType,
    __seedNameType__: seedNameType, __seedFile__: seedFile.replace(/\.ts$/, ""), __firstSeed__: firstSeed,
    __unavailableSeed__: unavailableSeed, __transport__: transport[1], __transportPath__: transport[2],
    __entityId__: entityId, __fixtureId__: fixtureId,
  });
  const templateRoot = fileURLToPath(new URL("../new-skin/templates/", import.meta.url));
  change.fromTemplates(["card"], fill, templateRoot);
  change.create(`${SKIN}/cards/${name}/demo/${seedFile}`, seeds);

  // The Card registry is the runtime and generator seam: routing plus the Connected adapter in one row.
  change.edit(registryPath, after(markers.registryImports, fill(`import { Ha__Skin____Name__Card } from "../ha/Ha__Skin____Name__Card";
`)));
  change.edit(registryPath, after(markers.registryEntries, fill(`  __name__: { domains: [${domains.map((domain) => `"${domain}"`).join(", ")}]${shared?.id ? `, id: ${shared.id}` : ""}, render: (item, footprint) => <Ha__Skin____Name__Card entityId={item.entity}${commonLive} footprint={footprint} /> },`)));

  change.edit(generatedSkin.file(skin, generatedSkin.files.entry), after(markers.skinCards, fill(`export { __Skin____Name__Card } from "./cards/__name__/__Skin____Name__Card";
export type { __Skin____Name__CardProps } from "./cards/__name__/__Skin____Name__Card";
export { Ha__Skin____Name__Card } from "./ha/Ha__Skin____Name__Card";
export type { Ha__Skin____Name__CardProps } from "./ha/Ha__Skin____Name__Card";
`)));

  // Static Storybook ordering and the design-rules page.
  change.edit(seams.preview, (source) => {
    const start = source.indexOf(`"${Section}", [`);
    if (start === -1) return source;
    const own = source.slice(start);
    const insert = (marker) => after(marker, `              "${Name}",\n`);
    return source.slice(0, start) + insert(markers.previewConnected)(insert(markers.previewCards)(own));
  });
  const rules = `${SKIN}/stories/DesignRules.mdx`;
  change.edit(rules, after(markers.designRuleImports, fill(`import * as __Name__ from "../cards/__name__/__Skin____Name__Card.stories";
`)));
  change.edit(rules, after(markers.designRuleStories, fill(`    __Label__: [__Name__.AllStates, __Name__.Footprints],`)));
  if (change.exists(`${SKIN}/cards/Empty.stories.tsx`)) change.remove(`${SKIN}/cards/Empty.stories.tsx`);
  if (change.exists(`${SKIN}/ha/Empty.stories.tsx`)) change.remove(`${SKIN}/ha/Empty.stories.tsx`);

  change.edit(seams.skinDoc(skin), (source) => `${source.trimEnd()}\n\n## ${Label}\n\nThe generated ${words} Card shows its normalized state and a truthful primary reading. ${actions.length ? `Its neutral actions are ${actions.map((action) => `\`${labelOf(action)}\``).join(", ")}.` : "It starts read-only because its shared actions need domain-specific input."} Replace the placeholder glyph and detail facts during bespoke design.\n`);
  change.edit(seams.cardsDoc, (source) => {
    const at = source.indexOf(`## Using the ${words} card`);
    if (at === -1) return source;
    const next = source.indexOf("\n## ", at + 1);
    const end = next === -1 ? source.length : next + 1;
    return `${source.slice(0, end).trimEnd()}\n\n### ${Section} ${words} Card\n\n\`${Skin}${Name}Card\` is the ${Section} skin's neutral drawing of the shared \`${Name}Entity\`; \`Ha${Skin}${Name}Card\` connects the same \`useHa${Name}\` hook. See [${skin}.md](${skin}.md#${words.replace(/ /g, "-")}).\n\n${source.slice(end)}`;
  });
  const dashboardStory = `${SKIN}/lovelace/${Skin}Dashboard.stories.tsx`;
  change.edit(dashboardStory, after(markers.dashboardCards, `  { entity: "${entityId}", kind: "${name}" },`));

  if (suppliedChange) return { Name, Skin, Section, writes: change.writes };
  if (!change.commit(dryRun)) return;
  console.log(`Drew ${words} in ${Section} as a neutral ${kind}: ${actions.length ? actions.join(", ") : "read-only"}.\n\nNext:\n  1. npm run storybook  →  ${Section}/Cards/${Name} and ${Section}/Connected/${Name}\n  2. Replace its glyph, summary, actions and Details with the domain's own design\n  3. npm run check && npm run test-storybook && npm run build:ha`);
}

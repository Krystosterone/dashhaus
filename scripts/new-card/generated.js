/** Add one existing shared domain to a neutral skin created by `new-skin`. */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generated as generatedSkin, markers, packageSpecifier, seams, skinTemplates, storySection, studies } from "../packages.js";
import { describeDomain } from "../domains.js";
import { after, changes, exists, fail, read, root, skinDir } from "./lib.js";

const objectBody = (source, name) => source.match(new RegExp(`export const ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`))?.[1];
const shape = (source, name) => source.match(new RegExp(`(?:interface|type) ${name}\\b[^{]*\\{([\\s\\S]*?)\\n?\\}`))?.[1];
/** The card writer every skin shares, from the scaffolder that ships it. */
const card = await import(pathToFileURL(join(root, skinTemplates.writer)).href);

/** Plan or write one Card in a generated skin. A supplied transaction lets another generator validate the whole operation before writing. */
export function newGeneratedCard({ skin, name, kind: askedKind, dryRun, change: suppliedChange }) {
  let domain;
  let drawn;
  try {
    domain = describeDomain(name);
    drawn = card.cardKind(domain, askedKind);
  } catch (error) {
    fail(error.message);
  }
  const { Name, CONST, words, Label } = domain;
  const { kind, actions } = drawn;
  const skinNames = card.skinNames(skin);
  const { Skin, Section } = skinNames;
  const SKIN = generatedSkin.dir(skin);
  const registryPath = generatedSkin.file(skin, generatedSkin.files.registry);
  const change = suppliedChange ?? changes();
  if (!change.exists(generatedSkin.file(skin, generatedSkin.files.manifest))) fail(`${skin} is not a generated skin package: ${generatedSkin.file(skin, generatedSkin.files.manifest)} is missing. Start it with npm run new-skin -- ${skin}`);
  if (!change.exists(registryPath)) fail(`${skin} is not a generated skin: ${registryPath} is missing. Start it with npm run new-skin -- ${skin}`);
  if (change.exists(`${SKIN}/cards/${name}`)) fail(`${SKIN}/cards/${name} already exists`);
  // The skin's Storybook section is what its setup declares: its name, or `Studies/<Name>` for a study.
  const storybookPath = generatedSkin.file(skin, generatedSkin.files.storybook);
  const Stories = storySection(change.read(storybookPath));
  if (!Stories) fail(`${storybookPath} declares no \`section: "…"\``);
  const study = studies.is(JSON.parse(change.read(generatedSkin.file(skin, generatedSkin.files.manifest))));

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
  const transport = orbStory.match(/import \{ (createDemo\w*HaTransport)\b[^}]*\} from "(@dashhaus\/core\/demo)"/);
  const entityId = orbStory.match(/entityId="([^"]+)"/)?.[1];
  if (!transport || !entityId) fail(`${orbStoryPath} must import a demo transport and draw an entityId`);
  const demoProps = hasHook ? actions.map((action) => ` ${action}={demo.${action}}`).join("") : "";
  const lines = card.registryLines(domain, skinNames);

  const fill = card.filler({
    ...card.cardTokens(domain, skinNames, actions),
    __Stories__: Stories, __demoProps__: demoProps,
    __DEMO__: hasHook ? `useDemo${Name}(seed)` : "seed", __demoImport__: hasHook ? `, useDemo${Name}` : "",
    __testProps__: "", __seedConst__: seedConst, __worstConst__: worstConst, __seedType__: seedType,
    __seedNameType__: seedNameType, __seedFile__: seedFile.replace(/\.ts$/, ""), __firstSeed__: firstSeed,
    __unavailableSeed__: unavailableSeed, __transport__: transport[1], __transportPath__: transport[2],
    __entityId__: entityId, __fixtureId__: domain.fixtureId,
  });
  // The card every skin shares, from the scaffolder's templates, then its stories and tests in this repository.
  change.fromTemplates([""], fill, join(root, skinTemplates.card), SKIN);
  change.fromTemplates(["repo-card"], fill, fileURLToPath(new URL("../new-skin/templates/", import.meta.url)), SKIN);
  change.create(`${SKIN}/cards/${name}/demo/${seedFile}`, seeds);

  // The Card registry is the runtime and generator seam: routing plus the Connected adapter in one row.
  change.edit(registryPath, after(markers.registryImports, lines.import));
  change.edit(registryPath, after(markers.registryEntries, lines.entry));

  change.edit(generatedSkin.file(skin, generatedSkin.files.entry), after(markers.skinCards, fill(`export { __Skin____Name__Card } from "./cards/__name__/__Skin____Name__Card";
export type { __Skin____Name__CardProps } from "./cards/__name__/__Skin____Name__Card";
export { Ha__Skin____Name__Card } from "./ha/Ha__Skin____Name__Card";
export type { Ha__Skin____Name__CardProps } from "./ha/Ha__Skin____Name__Card";
`)));

  // Static Storybook ordering and the design-rules page.
  change.edit(seams.preview, (source) => {
    // Walk the section's path through storySort's nesting: `Studies/Atelier` is "Atelier" inside "Studies".
    const start = Stories.split("/").reduce((at, part) => at === -1 ? -1 : source.indexOf(`"${part}", [`, at), 0);
    if (start === -1) return source;
    const own = source.slice(start);
    const insert = (marker) => (text) => {
      const at = text.indexOf(marker);
      const indent = at === -1 ? "" : text.slice(text.lastIndexOf("\n", at) + 1, at);
      return after(marker, `${indent}"${Name}",\n`)(text);
    };
    return source.slice(0, start) + insert(markers.previewConnected)(insert(markers.previewCards)(own));
  });
  const rules = `${SKIN}/stories/DesignRules.mdx`;
  change.edit(rules, after(markers.designRuleImports, fill(`import * as __Name__ from "../cards/__name__/__Skin____Name__Card.stories";
`)));
  change.edit(rules, after(markers.designRuleStories, fill(`    __Label__: [__Name__.AllStates, __Name__.Footprints],`)));
  if (change.exists(`${SKIN}/cards/Empty.stories.tsx`)) change.remove(`${SKIN}/cards/Empty.stories.tsx`);
  if (change.exists(`${SKIN}/ha/Empty.stories.tsx`)) change.remove(`${SKIN}/ha/Empty.stories.tsx`);

  change.edit(study ? studies.designDoc(skin) : seams.skinDoc(skin), (source) => `${source.trimEnd()}\n\n## ${Label}\n\nThe generated ${words} Card shows its normalized state and a truthful primary reading. ${actions.length ? `Its neutral actions are ${actions.map((action) => `\`${card.labelOf(action)}\``).join(", ")}.` : "It starts read-only because its shared actions need domain-specific input."} Replace the placeholder glyph and detail facts during bespoke design.\n`);
  // spec/cards.md describes the shipped skins' cards; a study's stay in its own design rules.
  if (!study) change.edit(seams.cardsDoc, (source) => {
    const at = source.indexOf(`## Using the ${words} card`);
    if (at === -1) return source;
    const next = source.indexOf("\n## ", at + 1);
    const end = next === -1 ? source.length : next + 1;
    return `${source.slice(0, end).trimEnd()}\n\n### ${Section} ${words} Card\n\n\`${Skin}${Name}Card\` is the ${Section} skin's neutral drawing of the shared \`${Name}Entity\`; \`Ha${Skin}${Name}Card\` connects the same \`useHa${Name}\` hook. See [${skin}.md](${skin}.md#${words.replace(/ /g, "-")}).\n\n${source.slice(end)}`;
  });
  // The Examples page draws every Card's seeds, a section each (a hand-composed page has no markers and is left alone).
  const examples = `${SKIN}/dashboards/Examples.stories.tsx`;
  change.edit(examples, after(markers.exampleImports, fill(`import __Name__Stories from "../cards/__name__/__Skin____Name__Card.stories";
`)));
  change.edit(examples, after(markers.exampleSections, fill(`  section("__Label__", __Name__Stories.argTypes.__name__.options, (seed, footprint) => <__Name__Stories.component __name__={seed} footprint={footprint} />),`)));
  const dashboardStory = `${SKIN}/lovelace/${Skin}Dashboard.stories.tsx`;
  change.edit(dashboardStory, after(markers.dashboardCards, `  { entity: "${entityId}", kind: "${name}" },`));

  if (suppliedChange) return { Name, Skin, Section, writes: change.writes };
  if (!change.commit(dryRun)) return;
  console.log(`Drew ${words} in ${Section} as a neutral ${kind}: ${actions.length ? actions.join(", ") : "read-only"}.\n\nNext:\n  1. npm run storybook  →  ${Stories}/Cards/${Name} and ${Stories}/Connected/${Name}\n  2. Replace its glyph, summary, actions and Details with the domain's own design\n  3. npm run check && npm run test-storybook && npm run build:ha`);
}

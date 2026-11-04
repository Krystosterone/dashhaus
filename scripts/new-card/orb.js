/**
 * Draws a domain that already exists in @dashhaus/core in the orb skin, from its one description (`describeDomain`, the
 * scaffolder's `domains.json` too):
 *
 *   npm run new-card -- <name> --code <xx> [--kind control|reading] [--dry-run]
 *
 * It is how orb's card for a shared domain starts when the domain came first (from another skin, or a card redrawn):
 * the card in the card frame, its tile, stories on the domain's seeds, its connected tile and its Lovelace card. A
 * control's taps go on the orb and the pill (`onToggle`), or on pills of their own; a reading is a bare icon and its
 * state in words. What asks first or takes a code is drawn by hand, from the lock's card; an action that takes a value
 * is left out, saying so. Nothing is written unless every file and every registration can be made.
 */
import { markers, packageFile, packageSpecifier } from "../packages.js";
import { after, before, card, changes, exists, fail, filler, names, read, seams, skinDir } from "./lib.js";
import { describeDomain } from "../domains.js";

const SKIN = skinDir("orb");

/** The body of a top-level `export const <name> … = { … }` object, up to its closing brace at the margin. */
const objectBody = (source, name) => source.match(new RegExp(`export const ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`))?.[1];

export function newOrbCard({ name, code, kind: askedKind, dryRun }) {
  const { Name, CONST, words, Label } = names(name, '"fan"');
  if (exists(`${SKIN}/cards/${name}`)) fail(`${SKIN}/cards/${name} already exists`);
  if (!code || !/^[a-z]{2}$/.test(code)) fail(`code "${code}" must be two lower-case letters: the card's CSS class prefix`);
  let domain;
  let drawn;
  try {
    domain = describeDomain(name);
    drawn = card.cardKind(domain, askedKind);
  } catch (error) {
    fail(error.message);
  }
  const { kind, actions: taps, guarded, leftOut } = drawn;
  if (guarded.length) fail(`${guarded.map(({ action }) => action).join(", ")} ${guarded.length > 1 ? "ask" : "asks"} first or ${guarded.length > 1 ? "take" : "takes"} a code: draw ${words} in orb by hand, from ${SKIN}/cards/lock/ (its sheet answers on Confirm or Keypad)`);

  // ---------- The domain's seeds and its demo, in core ----------
  const seedPath = packageFile("core", `src/seeds/${name}.ts`);
  if (!exists(seedPath)) fail(`${seedPath} doesn't exist: a domain's demo seeds live in @dashhaus/core, for every skin's stories`);
  const seeds = read(seedPath);
  for (const needed of [`${CONST}_SEEDS`, `${CONST}_WORST_CASE`, `${Name}Seed`, `${Name}SeedName`]) {
    if (!new RegExp(`export (const|interface|type) ${needed}\\b`).test(seeds)) fail(`${seedPath} must export ${needed}`);
  }
  const hasHook = new RegExp(`export function useDemo${Name}\\b`).test(seeds);
  const seedBody = objectBody(seeds, `${CONST}_SEEDS`) ?? "";
  const seedKeys = [...seedBody.matchAll(/^ {2}(\w+): /gm)].map((m) => ({ key: m[1], index: m.index }));
  const seedText = (i) => seedBody.slice(seedKeys[i].index, seedKeys[i + 1]?.index);
  const unavailableSeed = seedKeys.find((_, i) => /state: "unavailable"/.test(seedText(i)))?.key;
  const firstSeed = seedKeys.find((_, i) => !/state: "unavailable"/.test(seedText(i)))?.key;
  if (!unavailableSeed || !firstSeed) fail(`${CONST}_SEEDS needs an unavailable example and an available one, for the Unavailable and default stories`);

  // The connected story: the domain's own demo transport and its first entity, or the mixed one's.
  const demoPath = packageFile("core", `src/demo/${name}.ts`);
  const own = exists(demoPath) && new RegExp(`export function createDemo${Name}HaTransport\\b`).test(read(demoPath));
  const transport = own ? `createDemo${Name}HaTransport` : "createDemoHaTransport";
  const entityId = (own ? read(demoPath) : read(packageFile("core", "src/demo.ts"))).match(new RegExp(`"((?:${domain.domains.join("|")})\\.\\w+)": \\{`))?.[1];
  if (!entityId) fail(`no ${domain.domains.join(" or ")} entity in ${own ? demoPath : packageFile("core", "src/demo.ts")}, for its connected story`);

  // ---------- The card, from the description ----------
  const has = (field) => domain.fields.includes(field);
  const toggle = taps.includes("onToggle");
  const slotTap = toggle ? "onToggle" : taps[0];
  const sheetTaps = taps.filter((action) => action !== slotTap);
  const pill = (action) => `<TogglePill label={\`${card.labelOf(action)} \${e.name}\`} on={false} onToggle={() => ${action}?.()}>${card.labelOf(action)}</TogglePill>`;
  const control = kind === "reading"
    ? "<Readout label={`${e.name}: ${word}`} onOpen={card.sheet ? undefined : onOpenDetails}>{word}</Readout>"
    : toggle ? "<TogglePill label={`${e.name}: ${word}`} on={on} onToggle={() => onToggle?.()}>{word}</TogglePill>"
    : pill(slotTap);
  const today = domain.history && domain.samples;
  const partsImport = [kind === "reading" && "Readout", sheetTaps.length && "SheetBlock", today && "Today", kind === "control" && "TogglePill"].filter(Boolean).map((part) => `${part}, `).join("");
  const facts = ["lastSeenFact", ...(has("lastChanged") ? ["lastChangedFact"] : [])].sort();
  const demoProps = taps.filter((action) => new RegExp(`\\b${action}\\b`).test(seeds)).map((action) => `${action}={demo.${action}}`).join(" ");
  const fixture = JSON.parse(read(packageFile("core", `src/ha/fixtures/${name}.json`)));

  const fill = filler({
    __Name__: Name, __name__: name, __CONST__: CONST, __Label__: Label, __label__: words, __code__: code,
    __domains__: domain.domains.map((d) => `${d}.*`).join("`, `"),
    __about__: kind === "control"
      ? `${toggle ? "The orb and the pill switch it." : `${card.labelOf(slotTap)} is its pill.`}${sheetTaps.length ? ` The sheet has ${sheetTaps.map(card.labelOf).join(", ")}.` : ""} The name, or a press and hold on the orb, opens the sheet.`
      : "A reading: a bare icon and its state in words. The name, or the reading, opens the sheet.",
    __historyType__: domain.history ? `, ${Name}History` : "",
    __historyProp__: domain.history ? "  /** Shown in the featured footprint and in the sheet. */\n  history?: " + `${Name}History;` : "",
    __historyArg__: today ? ", history" : "",
    __actionProps__: taps.map((action) => `  ${action}?: () => void;`).join("\n"),
    __actionArgs__: taps.map((action) => `, ${action}`).join(""),
    __factsImport__: facts.join(", "),
    __todaySummaryImport__: today && domain.minutes ? `\nimport { todaySummary } from "${packageSpecifier("core", "entities/today")}";` : "",
    __partsImport__: partsImport,
    __areaArg__: has("area") ? ", area: e.area" : "",
    __onConst__: kind === "control" ? `  const on = ${domain.onOff ? 'e.state === "on"' : '!unav && e.state !== "off"'};` : "",
    __roleWhy__: kind === "control"
      ? 'A state: on is the accent, with no glow. "energy" (bloom and glow) is for light, heat or daylight (attention-budget skill).'
      : "A reading: neutral, a bare icon and no glow.",
    __role__: kind === "control" ? "state" : "reading",
    __summary__: domain.summary,
    __leftOut__: leftOut.length ? `  // Left out: ${leftOut.join(", ")} take${leftOut.length > 1 ? "" : "s"} a value a press can't give; draw ${leftOut.length > 1 ? "them" : "it"} with orb's own parts.` : "",
    __iconProp__: kind === "control" && toggle
      ? `orb={{ label: e.name, pressed: on, intensity: 0.7, onToggle: () => onToggle?.(), children: <${Name}Icon /> }}`
      : `glyph={<${Name}Icon />}`,
    __lastSeen__: has("lastSeen") ? "e.lastSeen" : "undefined",
    __status__: has("area") ? "card.area" : '""',
    __control__: control,
    __factsStart__: `unav ? lastSeenFact(${has("lastSeen") ? "e.lastSeen" : "undefined"}) : ${has("lastChanged") ? "lastChangedFact(e.lastChanged)" : '""'}`,
    __sheetBlocks__: sheetTaps.length ? `      <SheetBlock>\n${sheetTaps.map((action) => `        ${pill(action)}`).join("\n")}\n      </SheetBlock>` : "",
    __todayBlock__: today ? `      {history && <Today samples={history.samples} currentHour={history.currentHour} summary={${domain.minutes ? `todaySummary("${domain.minutes}", history.${domain.minutes}Minutes)` : '""'}} />}` : "",
    // The stories, on the domain's seeds in core.
    __seeds__: packageSpecifier("core", `seeds/${name}`),
    __firstSeed__: firstSeed,
    __unavailableSeed__: unavailableSeed,
    __DEMO__: hasHook ? `useDemo${Name}(seed)` : "seed",
    __demoImport__: hasHook ? `, useDemo${Name}` : "",
    __historyDemo__: today ? "        history={demo.history}" : "",
    __demoProps__: demoProps,
    // The connected tile and its story and test.
    __historyDestructure__: today ? ", history" : "",
    __actions__: kind === "control" ? ", actions" : "",
    __historyLive__: today ? "      history={history}" : "",
    __liveProps__: taps.map((action) => `${action}={actions.${action}}`).join(" "),
    __transport__: transport,
    __entityId__: entityId,
    __fixtureId__: domain.fixtureId,
    __loadHistory__: domain.options.includes("loadHistory") ? " loadHistory={false}" : "",
  });
  if (!fixture[domain.fixtureId]) fail(`${domain.fixtureId} is not in its fixture`);

  const change = changes();
  const { edit } = change;
  change.fromTemplates(["common", "orb"], fill);

  // ---------- Registrations ----------
  edit(`${SKIN}/index.ts`, after(markers.skinCards, fill(`// __Label__
export { __Name__Card, __Name__Sheet } from "./cards/__name__/__Name__Card";
export type { __Name__CardProps, __Name__SheetProps } from "./cards/__name__/__Name__Card";
export { __Name__Tile } from "./cards/__name__/__Name__Tile";
export type { __Name__TileProps } from "./cards/__name__/__Name__Tile";
export { Ha__Name__Tile } from "./ha/Ha__Name__Tile";
export type { Ha__Name__TileProps } from "./ha/Ha__Name__Tile";

`)));
  const agents = read(seams.agents);
  if (!agents.includes(`\`${code}-\` `)) edit(seams.agents, before(markers.orbCodes, `, \`${code}-\` ${words}`));

  // Its Lovelace card: its domains pick it, or `card:` where another card already draws one.
  const lovelace = seams.orb.config;
  const config = read(lovelace);
  const taken = domain.domains.filter((d) => new RegExp(`^\\s*${d}: "\\w+",`, "m").test(config));
  const shared = taken.length > 0;
  edit(lovelace, after(markers.kinds, `  | "${name}"\n`));
  edit(lovelace, shared
    ? after(markers.sharedKinds, `  ${name}: { domains: [${domain.domains.map((d) => `"${d}"`).join(", ")}]${domain.id ? `, id: ${domain.id}` : ""} },`)
    : after(markers.domainKinds, domain.domains.map((d) => `  ${d}: "${name}",`).join("\n")));
  edit(lovelace, after(markers.cardConfigs, `  | { kind: "${name}"; color?: ColorName | "none" }`));
  edit(lovelace, after(markers.kindSpecs, `  ${name}: { keys: ["color"], options: (read, raw, at) => ({ color: readColor(read, raw, at, COLOR_NAMES) }) },`));
  const renderer = seams.orb.renderer;
  const passed = domain.options.map((key) => key === "loadHistory" ? " loadHistory={card.history}" : ` ${key}={card.${key}}`).join("");
  edit(renderer, after(markers.tileImports, fill(`import { Ha__Name__Tile } from "../ha/Ha__Name__Tile";
`)));
  edit(renderer, after(markers.tiles, `  ${name}: (card, key) => <Ha${Name}Tile key={key} entityId={card.entity}${passed} footprint={card.footprint} showControl={card.showControl} color={card.color} />,`));
  // The automatic layout: a control on domains of its own joins the compact controls per area.
  const auto = read(seams.orb.auto);
  const placed = kind === "control" && !shared ? domain.domains.filter((d) => !auto.includes(`"${d}",`)) : [];
  for (const d of placed) {
    edit(seams.orb.auto, after(markers.autoControls, `    "${d}",\n`));
    edit(seams.orb.auto, after(markers.autoOrder, `    "${d}",\n`));
  }
  const deploy = read(seams.deployDoc);
  for (const d of domain.domains.filter((d) => !deploy.includes(`- \`${d}\``))) {
    edit(seams.deployDoc, after(markers.deployDomains, `- \`${d}\`${shared ? ` with \`card: ${name}\`` : ""}: ${words}\n`));
  }
  if (!new RegExp(`^\\| [a-z0-9, ]*\\b${words}\\b[a-z0-9, ]* \\| \`color\` \\|`, "m").test(deploy)) {
    edit(seams.deployDoc, (s) => s.replace(/^\| ([a-z0-9, ]+) \| `color` \|/m, `| $1, ${words} | \`color\` |`));
  }
  if (!read(seams.cardsDoc).includes(`## Using the ${words} card`)) {
    edit(seams.cardsDoc, before(markers.cardsDoc, fill(`## Using the __label__ card

One \`${domain.domains.join("`, `")}\` entity:

\`\`\`tsx
<__Name__Tile entity={entity} />
<Ha__Name__Tile entityId="${entityId}" />
\`\`\`

- **Drawn from its domain's description:** finish its words, readout and sheet here.

`)));
  }

  if (!change.commit(dryRun)) return;
  console.log(`Drew ${words} in orb as a ${kind}: ${taps.length ? taps.join(", ") : "read-only"}${leftOut.length ? ` (left out ${leftOut.join(", ")}: ${leftOut.length > 1 ? "they take values" : "it takes a value"} a press can't give)` : ""}.

Next:
  1. npm run storybook  →  Orb/Cards/${Name} and Orb/Connected/${Name}
  2. Give it its words and readout in ${SKIN}/cards/${name}/${Name}Card.tsx (spec/orb.md → Design rules)
  3. Draw its icon in ${SKIN}/cards/${name}/icons.tsx
  4. Finish "Using the ${words} card" in ${seams.cardsDoc}${shared ? `
  5. ${taken.join(", ")} already ${taken.length > 1 ? "have" : "has"} a card, so a card picks this one with \`card: ${name}\`` : ""}
  ${shared ? 6 : 5}. npm run check && npm run test-storybook`);
}

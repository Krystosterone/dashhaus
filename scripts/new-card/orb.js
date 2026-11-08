/**
 * Draws a domain that already exists in @dashhaus/core in the orb skin, from its one description (`describeDomain`, the
 * scaffolder's `domains.json` too):
 *
 *   npm run new-card -- <name> --code <xx> [--kind control|reading] [--dry-run]
 *
 * It is how orb's card for a shared domain starts when the domain came first (from another skin, or a card redrawn):
 * the card in the card frame, its tile, stories on the domain's seeds, its connected tile and its Lovelace card. A
 * control's taps go on the orb and the pill (`onToggle`), or on pills of their own; what asks first or takes a code is
 * a pill too, answered in the sheet on `Confirm` or `Keypad` (`useGuardedAction`, as the lock's card), never one press
 * (one that asks only where its `when` says asks for those entities, and a level that asks there is left out there);
 * a reading is a bare icon and its state in words. An action that takes a value it has no part for is left out,
 * saying so. Nothing is written unless every file and every registration can be made.
 */
import { markers, packageFile, packageSpecifier } from "../packages.js";
import { after, before, card, changes, exists, fail, filler, names, read, seams, skinDir, smallPrint } from "./lib.js";
import { describeDomain } from "../domains.js";

const SKIN = skinDir("orb");

/** The body of a top-level `export const <name> … = { … }` object, up to its closing brace at the margin. */
const objectBody = (source, name) => source.match(new RegExp(`export const ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`))?.[1];

export function newOrbCard({ name, code, kind: askedKind, dryRun }) {
  const { Name, CONST, words, Label } = names(name, '"fan"');
  if (exists(`${SKIN}/cards/${name}`)) fail(`${SKIN}/cards/${name} already exists`);
  if (!code || !/^[a-z]{2}$/.test(code)) fail(`code "${code}" must be two lower-case letters: the card's CSS class prefix`);
  let domain;
  try {
    domain = describeDomain(name);
  } catch (error) {
    fail(error.message);
  }
  // A tap, a guarded action, a level, a choice or a switch: each on orb's own part.
  const { actions: taps, guarded, levels, choices, switches } = domain;
  const drawnValues = [...levels, ...choices, ...switches].map(({ action }) => action);
  const leftOut = domain.leftOut.filter((action) => !drawnValues.includes(action));
  const kind = askedKind ?? (taps.length || guarded.length || drawnValues.length ? "control" : "reading");
  if (kind !== "control" && kind !== "reading") fail(`kind "${kind}" must be "control" or "reading"`);
  if (kind === "control" && !taps.length && !guarded.length && !drawnValues.length) fail(`${words} has no action orb can draw: pass --kind reading`);
  const values = kind === "control" ? { levels, choices, switches } : { levels: [], choices: [], switches: [] };
  // What asks first, or takes a code: a pill that asks (or tries, and asks for the code where the entity wants one).
  const asked = kind === "control" ? guarded : [];

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
  const { keyOf } = card;
  /**
   * A guarded action's pill: one that asks says so with an ellipsis ("Unlock…"), as the lock's card does. One that asks
   * only for some entities (its `when`: a garage door, door or gate's open) asks for those and runs at once for the rest.
   */
  const guardPill = ({ action, asks, when }) => {
    const label = card.labelOf(action);
    if (asks && when) {
      const ifAsks = card.whenExpr(when);
      return `<TogglePill label={\`${label} \${e.name}\${${ifAsks} ? "…" : ""}\`} on={false} onToggle={() => (${ifAsks} ? guard.ask("${keyOf(action)}") : void guard.attempt("${keyOf(action)}"))}>{${ifAsks} ? "${label}…" : "${label}"}</TogglePill>`;
    }
    const more = asks ? "…" : "";
    return `<TogglePill label={\`${label} \${e.name}${more}\`} on={false} onToggle={() => ${asks ? `guard.ask("${keyOf(action)}")` : `void guard.attempt("${keyOf(action)}")`}}>${label}${more}</TogglePill>`;
  };
  // With no tap and no level for the slot, the first guarded action takes it.
  const [slotGuard, ...sheetGuards] = !slotTap && !values.levels.length ? asked : [undefined, ...asked];
  // A value's words, from its field: "presetMode" → "Preset mode".
  const fieldWords = (field) => card.labelOf(`on${field[0].toUpperCase()}${field.slice(1)}`);
  const bound = (b) => typeof b === "number" ? String(b) : `e.${b.field}`;
  /**
   * A level on orb's level groove: the first in the slot, named by the card; the others in the sheet, under a heading.
   * One that asks first for some entities (its `when`: a garage door's position) is left out for those, since no orb
   * part asks before a level: shown, never set.
   */
  const levelBar = ({ action, field, min, max, wakes, when }, slot) => {
    const bar = levelGroove({ action, field, min, max, wakes }, slot);
    return when && !slot ? `{!(${card.whenExpr(when)}) && ${bar}}` : bar;
  };
  const levelGroove = ({ action, field, min, max, wakes }, slot) => {
    const percent = typeof min === "number" && typeof max === "number" && min >= 0 && max <= 100;
    return `<LevelBar id={\`\${card.uid}-${field}\`} ${slot ? `label={\`\${e.name} ${fieldWords(field).toLowerCase()}\`}` : `heading="${fieldWords(field)}"`} value={e.${field} ?? ${bound(min)}} min={${bound(min)}} max={${bound(max)}} on={on}${wakes ? " wakes" : ""} text={(v) => ${percent ? "`${v}%`" : "String(v)"}} valueText={(v) => ${percent ? "`${v} percent`" : "String(v)"}} onChange={(v) => ${action}?.(v)} />`;
  };
  /** A choice as chips: the entity's own list, or a fixed one. */
  const choiceChips = ({ action, field, options }) => {
    const list = Array.isArray(options) ? `([${options.map((o) => `"${o}"`).join(", ")}] as const)` : `(e.${options.field} ?? [])`;
    const chips = `<ChoiceChips id={\`\${card.uid}-${field}\`} label="${fieldWords(field)}" options={${list}.map((o) => ({ value: o, label: optionWords(o) }))} value={e.${field} ?? null} onChange={(v) => ${action}?.(v)} />`;
    return Array.isArray(options) ? chips : `{${list}.length > 0 && ${chips}}`;
  };
  /** A switch as two chips, On and Off. */
  const switchChips = ({ action, field }) => `<ChoiceChips id={\`\${card.uid}-${field}\`} label="${fieldWords(field)}" options={[{ value: "on", label: "On" }, { value: "off", label: "Off" }]} value={e.${field} == null ? null : e.${field} ? "on" : "off"} onChange={(v) => ${action}?.(v === "on")} />`;
  const [slotLevel, ...sheetLevels] = values.levels;
  // Where the slot's level is left out (its `when`), the slot holds what it would without one.
  const unlevelled = toggle ? "<TogglePill label={`${e.name}: ${word}`} on={on} onToggle={() => onToggle?.()}>{word}</TogglePill>"
    : asked.length ? guardPill(asked[0]) : slotTap ? pill(slotTap) : "undefined";
  const control = kind === "reading"
    ? "<Readout label={`${e.name}: ${word}`} onOpen={card.sheet ? undefined : onOpenDetails}>{word}</Readout>"
    : slotLevel?.when ? `${card.whenExpr(slotLevel.when)} ? ${unlevelled} : ${levelBar(slotLevel, true)}`
    : slotLevel ? levelBar(slotLevel, true)
    : toggle ? "<TogglePill label={`${e.name}: ${word}`} on={on} onToggle={() => onToggle?.()}>{word}</TogglePill>"
    : slotTap ? pill(slotTap)
    : guardPill(slotGuard);
  // Taps the slot doesn't hold: with a level in the slot, every tap but the orb's; else every tap but the slot's.
  const otherTaps = slotLevel ? taps.filter((action) => action !== "onToggle") : sheetTaps;
  const sheet = [
    ...otherTaps.map(pill),
    ...sheetGuards.map(guardPill),
    ...sheetLevels.map((level) => levelBar(level, false)),
    ...values.choices.map(choiceChips),
    ...values.switches.map(switchChips),
  ];
  const today = domain.history && domain.samples;
  const partsImport = [
    values.choices.length + values.switches.length && "ChoiceChips",
    values.levels.length && "LevelBar",
    asked.length && "Confirm",
    asked.length && "Keypad",
    kind === "reading" && "Readout",
    (sheet.length || asked.length) && "SheetBlock",
    today && "Today",
    kind === "control" && (!slotLevel || otherTaps.length || asked.length) && "TogglePill",
  ].filter(Boolean).map((part) => `${part}, `).join("");
  // The sheet's small print: when first, then what the device is where the entity says (spec/cards.md).
  const small = smallPrint(has);
  const facts = [...small.facts].sort();
  const drawn = kind === "control" ? [...taps, ...asked.map(({ action }) => action), ...drawnValues] : [];
  const demoProps = drawn.filter((action) => new RegExp(`\\b${action}\\b`).test(seeds)).map((action) => `${action}={demo.${action}}`).join(" ");
  /** What each drawn action is handed, as the card's own prop type: it can't import the domain's handlers. */
  const handed = (action) => {
    const level = values.levels.find((v) => v.action === action);
    if (level) return "value: number";
    const choice = values.choices.find((v) => v.action === action);
    if (choice) return Array.isArray(choice.options) ? `value: ${choice.options.map((o) => `"${o}"`).join(" | ")}` : "value: string";
    if (values.switches.some((v) => v.action === action)) return "value: boolean";
    return "";
  };
  /** What a drawn action answers: a guarded one, whether it was done (the guard's result); any other, nothing. */
  const answers = (action) => (asked.some((g) => g.action === action) ? "GuardedResult" : "void");
  const actionKeys = asked.map(({ action }) => `"${keyOf(action)}"`).join(" | ");
  const codeKeys = asked.filter(({ code: takesCode }) => takesCode).map(({ action }) => `"${keyOf(action)}"`);
  const asks = asked.filter(({ asks: a }) => a);
  const guardBlock = asked.length ? [
    "  // What asks first, or takes a code, is answered in the sheet: its question, or its keypad where the entity wants one.",
    "  // On the dashboard a pill hands the action to the sheet, which opens on it; a stray press never does it.",
    `  const asked: Record<${Name}Action, { label: string; run?: (code?: string) => GuardedResult }> = {`,
    ...asked.map(({ action }) => `    ${/^[a-z]\w*$/.test(keyOf(action)) ? keyOf(action) : `"${keyOf(action)}"`}: { label: "${card.labelOf(action)}", run: ${action} },`),
    "  };",
    `  const guard = useGuardedAction<${Name}Action>({`,
    "    run: (a, code) => asked[a].run?.(code),",
    `    needsCode: ${!domain.code || !codeKeys.length ? "() => false" : codeKeys.length === asked.length ? "() => !!e.codeFormat" : `(a) => ([${codeKeys.join(", ")}] as string[]).includes(a) && !!e.codeFormat`},`,
    "    settled: () => unav,",
    "    initial: action,",
    "    askElsewhere: card.sheet ? undefined : (a) => onOpenDetails?.(a),",
    "  });",
  ].join("\n") : "";
  // The sheet: while an action waits on its answer, its question or keypad in the other blocks' place.
  const answer = [
    "guard.code",
    `  ? <Keypad key={guard.pendingKey} prompt={\`Enter the code to \${asked[guard.pending].label.toLowerCase()}\`} text={${domain.code ? 'e.codeFormat === "text"' : "false"}} onSubmit={guard.submit} onCancel={guard.close} />`,
    `  : <Confirm key={guard.pendingKey} busy={guard.busy} error={guard.failed ? "Didn’t go through. Try again." : null} question={\`\${asked[guard.pending].label} \${e.name}?\`} detail="It asks first, so a stray press never does it." action={asked[guard.pending].label} onConfirm={() => void guard.confirm()} onCancel={guard.close} />`,
  ];
  const at = (indent, lines) => lines.map((line) => indent + line).join("\n");
  const sheetBlocks = asked.length
    ? `      {!unav && (\n        <SheetBlock>\n${sheet.length
      ? `          {guard.pending ? (\n${at("            ", answer)}\n          ) : (\n            <>\n${sheet.map((block) => `              ${block}`).join("\n")}\n            </>\n          )}`
      : `          {guard.pending && (\n${at("            ", answer)}\n          )}`}\n        </SheetBlock>\n      )}`
    : sheet.length ? `      {!unav && (\n        <SheetBlock>\n${sheet.map((block) => `          ${block}`).join("\n")}\n        </SheetBlock>\n      )}` : "";
  const andList = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
  const guardedWords = asked.length
    ? ` ${[asks.length && `${andList(asks.map(({ action }) => card.labelOf(action)))} ${asks.length > 1 ? "ask" : "asks"} first, on the sheet's question or keypad`, asked.length > asks.length && `${andList(asked.filter((g) => !g.asks).map(({ action }) => card.labelOf(action)))} ${asked.length - asks.length > 1 ? "take" : "takes"} a code where the ${words} wants one`].filter(Boolean).join(", and ")}: never one press.`
    : "";
  const fixture = JSON.parse(read(packageFile("core", `src/ha/fixtures/${name}.json`)));
  // What the card test asks first for: an action that always asks on the first seed, else one that asks only for some
  // entities (its `when`) on the first seed it asks for; none when no seed is one it asks for.
  const seedAsks = (when) => seedKeys.find((_, i) => Object.entries(when).every(([field, values]) => values.includes(seedText(i).match(new RegExp(`\\b${field}: "([^"]+)"`))?.[1])))?.key;
  const tested = [...asks.filter(({ when }) => !when).map(({ action }) => ({ action, seed: firstSeed })), ...asks.filter(({ when }) => when).map(({ action, when }) => ({ action, seed: seedAsks(when) }))].find(({ seed }) => seed);

  const fill = filler({
    __Name__: Name, __name__: name, __CONST__: CONST, __Label__: Label, __label__: words, __code__: code,
    __domains__: domain.domains.map((d) => `${d}.*`).join("`, `"),
    __about__: kind === "control"
      ? `${slotLevel ? `${toggle ? "The orb switches it; t" : "T"}he groove sets its ${fieldWords(slotLevel.field).toLowerCase()}.` : toggle ? "The orb and the pill switch it." : `${card.labelOf(slotTap ?? slotGuard.action)} is its pill.`}${guardedWords}${sheet.length ? ` The sheet has ${andList([...otherTaps.map(card.labelOf), ...sheetGuards.map(({ action }) => card.labelOf(action)), ...[...sheetLevels, ...values.choices, ...values.switches].map(({ field }) => fieldWords(field).toLowerCase())])}.` : ""} The name, or a press and hold on the orb, opens the sheet.`
      : "A reading: a bare icon and its state in words. The name, or the reading, opens the sheet.",
    __historyType__: domain.history ? `, ${Name}History` : "",
    __historyProp__: domain.history ? "  /** Shown in the featured footprint and in the sheet. */\n  history?: " + `${Name}History;` : "",
    __historyArg__: today ? ", history" : "",
    __actionProps__: drawn.map((action) => `  ${action}?: (${answers(action) === "GuardedResult" ? "code?: string" : handed(action)}) => ${answers(action)};`).join("\n"),
    __actionArgs__: drawn.map((action) => `, ${action}`).join("") + (asked.length ? ", action" : ""),
    __guardImports__: asked.length ? `\nimport { useGuardedAction } from "${packageSpecifier("core", "primitives")}";\nimport type { GuardedResult } from "${packageSpecifier("core", "primitives")}";` : "",
    __propsBase__: asked.length ? `ActionCardProps<${Name}Action>` : "CardProps",
    __propsBaseImport__: asked.length ? "ActionCardProps" : "CardProps",
    __actionType__: asked.length ? `\n/** What asks first, or takes a code: the sheet opens on its question or keypad. */\nexport type ${Name}Action = ${actionKeys};\n` : "",
    __guardBlock__: guardBlock,
    __testImports__: tested ? "fireEvent, render, screen" : "render",
    __viImport__: tested ? ", vi" : "",
    __guardTest__: tested ? [
      "",
      `  it("never does what asks first on one press: the sheet asks first", () => {`,
      "    const run = vi.fn();",
      `    const { entity } = ${CONST}_SEEDS.${tested.seed};`,
      `    render(<${Name}Card entity={entity} variant="sheet" ${tested.action}={run} />);`,
      `    fireEvent.click(screen.getByRole("button", { name: \`${card.labelOf(tested.action)} \${entity.name}…\` }));`,
      "    expect(run).not.toHaveBeenCalled();",
      `    expect(screen.getByText(\`${card.labelOf(tested.action)} \${entity.name}?\`)).toBeTruthy();`,
      "  });",
    ].join("\n") : "",
    __onOpen__: asked.length ? "onOpenDetails && (() => onOpenDetails())" : "onOpenDetails",
    __closeFocus__: asked.length ? "\n      closeFocus={!guard.pending}" : "",
    __factsImport__: facts.join(", "),
    __todaySummaryImport__: today && domain.minutes ? `\nimport { todaySummary } from "${packageSpecifier("core", "entities/today")}";` : "",
    __partsImport__: partsImport,
    __areaArg__: has("area") ? ", area: e.area" : "",
    __onConst__: kind === "control" && (toggle || values.levels.length) ? `  const on = ${domain.onOff ? 'e.state === "on"' : '!unav && e.state !== "off"'};` : "",
    __roleWhy__: kind === "control"
      ? 'A state: on is the accent, with no glow. "energy" (bloom and glow) is for light, heat or daylight (attention-budget skill).'
      : "A reading: neutral, a bare icon and no glow.",
    __role__: kind === "control" ? "state" : "reading",
    __summary__: domain.summary,
    __leftOut__: leftOut.length ? `  // Left out: ${card.leftOutWhy(leftOut, domain.runs, "orb's own parts")}.` : "",
    __iconProp__: kind === "control" && toggle
      ? `orb={{ label: e.name, pressed: on, intensity: 0.7, onToggle: () => onToggle?.(), children: <${Name}Icon /> }}`
      : `glyph={<${Name}Icon />}`,
    __lastSeen__: has("lastSeen") ? "e.lastSeen" : "undefined",
    __status__: has("area") ? "card.area" : '""',
    __control__: control,
    __factsStart__: small.start,
    __factsEnd__: small.end ? `, end: ${small.end}` : "",
    __batteryImport__: small.battery ? `\nimport { batteryText } from "${packageSpecifier("core", "entities/battery")}";` : "",
    __sheetBlocks__: sheetBlocks,
    __optionWords__: values.choices.length ? '\n/** An option in words: "deep_sleep" becomes "Deep sleep". */\nconst optionWords = (option: string) => { const words = stateWords(option); return words[0].toUpperCase() + words.slice(1); };' : "",
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
    __liveProps__: drawn.map((action) => `${action}={actions.${action}}`).join(" "),
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

  // Foundations → Worst case: its worst-case seeds beside every other card's (verify/storybook.test.ts).
  edit(seams.orb.worstCase, after(markers.worstCaseImports, fill(`import { Demo__Name__Tile } from "../cards/__name__/demo/Demo__Name__Tile";
import { __CONST___SEEDS, __CONST___WORST_CASE } from "__seeds__";
`)));
  edit(seams.orb.worstCase, after(markers.worstCases, fill("  card(__CONST___WORST_CASE, [__CONST___SEEDS.__firstSeed__], (seed, footprint) => <Demo__Name__Tile seed={seed} footprint={footprint} />),")));

  // Its Lovelace card: its domains pick it, or `card:` where another card already draws one.
  const lovelace = seams.orb.config;
  const config = read(lovelace);
  const taken = domain.domains.filter((d) => new RegExp(`^\\s*${d}: "\\w+",`, "m").test(config));
  const shared = taken.length > 0;
  edit(lovelace, after(markers.kinds, `  | "${name}"\n`));
  edit(lovelace, shared
    ? after(markers.sharedKinds, `  ${name}: { domains: [${domain.domains.map((d) => `"${d}"`).join(", ")}]${domain.id ? `, id: ${domain.id}` : ""} },`)
    : after(markers.domainKinds, domain.domains.map((d) => `  ${d}: "${name}",`).join("\n")));
  edit(lovelace, after(markers.cardConfigs, `  | { kind: "${name}" }`));
  edit(lovelace, after(markers.kindSpecs, `  ${name}: {},`));
  const renderer = seams.orb.renderer;
  const passed = domain.options.map((key) => key === "loadHistory" ? " loadHistory={card.history}" : ` ${key}={card.${key}}`).join("");
  edit(renderer, after(markers.tileImports, fill(`import { Ha__Name__Tile } from "../ha/Ha__Name__Tile";
`)));
  edit(renderer, after(markers.tiles, `  ${name}: (card, key) => <Ha${Name}Tile key={key} entityId={card.entity}${passed} footprint={card.footprint} showControl={card.showControl} />,`));
  // The automatic layout: a control on domains of its own joins the compact controls per area.
  const auto = read(seams.orb.auto);
  // A domain the layout already names (placed by hand, as the lock is under Security) is not placed again.
  const placed = kind === "control" && !shared ? domain.domains.filter((d) => !auto.includes(`"${d}"`)) : [];
  for (const d of placed) {
    edit(seams.orb.auto, after(markers.autoControls, `    "${d}",\n`));
    edit(seams.orb.auto, after(markers.autoOrder, `    "${d}",\n`));
    edit(seams.orb.auto, after(markers.autoCards, `  ${d}: "${name}",\n`));
  }
  // The wall: a control joins the actions band of its area's column (spec/deploy.md → The wall layout).
  const layout = packageFile("core", "src/lovelace/layout.ts");
  if (kind === "control" && !read(layout).includes(`    "${name}",`)) edit(layout, after(markers.wallActions, `    "${name}",\n`));
  const deploy = read(seams.deployDoc);
  for (const d of domain.domains.filter((d) => !deploy.includes(`- \`${d}\``))) {
    edit(seams.deployDoc, after(markers.deployDomains, `- \`${d}\`${shared ? ` with \`card: ${name}\`` : ""}: ${words}\n`));
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
  console.log(`Drew ${words} in orb as a ${kind}: ${drawn.length ? drawn.join(", ") : "read-only"}${leftOut.length ? ` (left out: ${card.leftOutWhy(leftOut, domain.runs, "orb's own parts")})` : ""}.

Next:
  1. npm run storybook  →  Orb/Cards/${Name} and Orb/Connected/${Name}
  2. Give it its words and readout in ${SKIN}/cards/${name}/${Name}Card.tsx (spec/orb.md → Design rules)
  3. Draw its icon in ${SKIN}/cards/${name}/icons.tsx
  4. Finish "Using the ${words} card" in ${seams.cardsDoc}${shared ? `
  5. ${taken.join(", ")} already ${taken.length > 1 ? "have" : "has"} a card, so a card picks this one with \`card: ${name}\`` : ""}
  ${shared ? 6 : 5}. npm run check && npm run test-storybook`);
}

/**
 * Draws a domain that already exists in the field skin:
 *
 *   npm run new-card -- <name> --skin field [--kind control|reading] [--code <xx>] [--dry-run]
 *   npm run new-card -- owlet --skin field --kind reading
 *
 * The domain, its `useHa<Name>` hook and its orb card come first; this reads them and draws only field's side
 * (AGENTS.md → Adding an existing domain to another skin). It copies ./templates/field/common plus
 * ./templates/field/<kind>, draws its stories from the domain's seeds in @dashhaus/core (every skin's, never a copy), and
 * registers the module everywhere verify/field-conformance.test.ts looks, the Lovelace card included:
 *   - control: one key per action the domain declares a press can give (`<NAME>_ACTIONS` beside its handlers): a tap
 *     acts (`onToggle` latches, its LED on while the entity is "on"); an action that asks first, or takes a code, opens
 *     the panel on the skin's Confirm or Keypad instead, never one tap (one that asks only where its `when` says, for
 *     those entities); a level that asks first is set on its fader, then asked in the panel (`levelQuestion`). An
 *     action that takes a value is left out, saying so. The default when the domain has one.
 *   - reading: the glyph on a flat plate and today's meter, nothing pressed. The default when it has none.
 * Today's meter is drawn only for a domain with a `<Name>History`: a lock's day is its last change.
 * Nothing is written unless every file and every registration can be made.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { markers, packageFile, packageSpecifier } from "../packages.js";
import { after, before, card, changes, exists, fail, filler, keypadWord, names, read, root, seams, skinDir, smallPrint, seedWords } from "./lib.js";
import { describeDomain } from "../domains.js";

const SKIN = skinDir("field");
const ORB = skinDir("orb");

/** The body of `export interface <name> { … }` (or a one-line `type <name> = { … }`) in a source file. */
const shape = (source, name) => source.match(new RegExp(`(?:interface|type) ${name}\\b[^{]*\\{([\\s\\S]*?)\\n?\\}`))?.[1];

/** The body of a top-level `export const <name> … = { … }` object, up to its closing brace at the margin. */
const objectBody = (source, name) => source.match(new RegExp(`export const ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`))?.[1];

export function newFieldCard({ name, kind: askedKind, code: askedCode, dryRun }) {
  // ---------- What the domain already has: its one description, the scaffolder's too ----------
  const { Name, CONST, words, Label } = names(name, '"sound"');

  if (exists(`${SKIN}/cards/${name}`)) fail(`${SKIN}/cards/${name} already exists`);
  if (!exists(packageFile("core", `src/entities/${name}/types.ts`))) fail(`${packageFile("core", `src/entities/${name}/types.ts`)} doesn't exist. Field draws a domain orb already has: npm run new-card -- ${name} --code <xx> --domain <ha_domain> first`);
  let domain;
  try {
    domain = describeDomain(name);
  } catch (error) {
    fail(`${error.message}. Draw ${words} in field by hand, from ${SKIN}/cards/light/ (AGENTS.md → Adding an existing domain to another skin)`);
  }
  // What each action is, as the domain declares it beside its handlers: never guessed from a signature.
  const taps = domain.actions.map((action) => ({ action, takes: "nothing", asks: false }));
  // One that asks only for some entities (its `when`: a garage door, door or gate's open) asks for those, and is a press
  // for the rest.
  const asked = domain.guarded.map(({ action, asks, code: takesCode, when }) => ({ action, takes: takesCode ? "code" : "nothing", asks, ...(when && { when }) }));
  // A level, a choice or a switch: on field's own parts (a fader, keys in a group); the rest is left out.
  const { levels, choices: chosen, switches } = domain;
  const valueActions = [...levels, ...chosen, ...switches].map(({ action }) => action);
  const leftOut = domain.leftOut.filter((action) => !valueActions.includes(action));
  const kind = askedKind ?? domain.kind;
  if (kind !== "control" && kind !== "reading") fail(`kind "${kind}" must be "control" or "reading"`);
  if (kind === "control" && !taps.length && !asked.length && !valueActions.length) {
    fail(`${words} has no action a press can give${leftOut.length ? ` (${leftOut.join(", ")} take${leftOut.length > 1 ? "" : "s"} a value)` : ""}, so it starts as a reading: pass --kind reading and add its controls by hand, or draw it from ${SKIN}/cards/light/`);
  }
  const pressed = kind === "control" ? [...taps, ...asked] : [];
  const values = kind === "control" ? { levels, choices: chosen, switches } : { levels: [], choices: [], switches: [] };
  const drawnValues = [...values.levels, ...values.choices, ...values.switches].map(({ action }) => action);
  const { history } = domain;

  // ---------- Orb's card (its code, its connected story) and the domain's seeds in core ----------
  const orbDir = `${ORB}/cards/${name}`;
  if (!exists(orbDir)) fail(`${orbDir} doesn't exist: field takes its card code and connected story from orb's card`);
  const fieldCodes = readdirSync(join(root, SKIN, "cards")).map((d) => exists(`${SKIN}/cards/${d}/${d[0].toUpperCase()}${d.slice(1)}Module.tsx`) && read(`${SKIN}/cards/${d}/${d[0].toUpperCase()}${d.slice(1)}Module.tsx`).match(/<ModuleFrame\s+kind="fd-([a-z]{2})"/)?.[1]).filter(Boolean);
  const code = askedCode ?? (exists(`${orbDir}/${Name}Card.tsx`) ? read(`${orbDir}/${Name}Card.tsx`).match(/useCard\("([a-z]{2})"/)?.[1] : undefined);
  if (!code || !/^[a-z]{2}$/.test(code)) fail(`no card code: pass --code <xx>, two lower-case letters for its fd-<xx>- classes`);
  if (fieldCodes.includes(code)) fail(`fd-${code}- is taken; in use: ${fieldCodes.map((c) => `fd-${c}-`).join(", ")}. Pass --code <xx>`);

  // The domain's seeds are every skin's, in @dashhaus/core: read them, never copy them.
  const seedPath = packageFile("core", `src/seeds/${name}.ts`);
  if (!exists(seedPath)) fail(`${seedPath} doesn't exist: a domain's demo seeds live in @dashhaus/core, for every skin's stories`);
  const seeds = read(seedPath);
  for (const needed of [`${CONST}_SEEDS`, `${CONST}_WORST_CASE`, `${Name}Seed`, `${Name}SeedName`]) {
    if (!new RegExp(`export (const|interface|type) ${needed}\\b`).test(seeds)) fail(`${seedPath} must export ${needed}`);
  }
  const hasHook = new RegExp(`export function useDemo${Name}\\b`).test(seeds);
  if (kind === "control" && !hasHook) fail(`${seedPath} has no useDemo${Name} for a control's stories to press`);
  if (history && !hasHook && !/\bhistory\b/.test(shape(seeds, `${Name}Seed`) ?? "")) fail(`${Name}Seed has no history and there is no useDemo${Name} to make one`);

  const seedBody = objectBody(seeds, `${CONST}_SEEDS`) ?? "";
  const seedKeys = [...seedBody.matchAll(/^ {2}(\w+): /gm)].map((m) => ({ key: m[1], index: m.index }));
  const seedText = (i) => seedBody.slice(seedKeys[i].index, seedKeys[i + 1]?.index);
  const unavailableSeed = seedKeys.find((_, i) => /state: "unavailable"/.test(seedText(i)))?.key;
  /** Whether a seed is one an action that asks only for some entities (its `when`) asks for. */
  const seedAsks = (key, when) => {
    const text = seedText(seedKeys.findIndex((entry) => entry.key === key));
    return Object.entries(when).every(([field, values]) => values.includes(text.match(new RegExp(`\\b${field}: "([^"]+)"`))?.[1]));
  };
  const firstSeed = seedKeys.find((_, i) => !/state: "unavailable"/.test(seedText(i)))?.key;
  if (!unavailableSeed || !firstSeed) fail(`${CONST}_SEEDS needs an unavailable example and an available one, for the Unavailable and default stories`);

  const orbStory = exists(`${ORB}/ha/Ha${Name}Tile.stories.tsx`) ? read(`${ORB}/ha/Ha${Name}Tile.stories.tsx`) : "";
  const transport = orbStory.match(/import \{ (createDemo\w+HaTransport)\b[^}]*\} from "(@dashhaus\/core\/demo)"/);
  const entityId = orbStory.match(/entityId="([^"]+)"/)?.[1];
  if (!transport || !entityId) fail(`${ORB}/ha/Ha${Name}Tile.stories.tsx must import a createDemo…HaTransport and draw an entityId, for field's connected story`);

  // The connected test's entity, and whether it asks for a code.
  const { fixtureId } = domain;
  const fixture = JSON.parse(read(packageFile("core", `src/ha/fixtures/${name}.json`)));
  const { domains } = domain;

  // ---------- Files from the templates ----------
  const has = (field) => domain.fields.includes(field);
  const toggle = taps.some(({ action }) => action === "onToggle") && domain.onOff;
  const wantsCode = domain.code;
  const { keyOf, labelOf } = card;
  // A value's words, from its field: "presetMode" → "Preset mode".
  const fieldWords = (field) => labelOf(`on${field[0].toUpperCase()}${field.slice(1)}`);
  const bound = (b) => typeof b === "number" ? String(b) : `e.${b.field}`;
  const isPercent = ({ min, max }) => typeof min === "number" && typeof max === "number" && min >= 0 && max <= 100;
  // A level that asks first (`asks`, for the entities its `when` says): set on its fader, then asked in the panel, as a
  // garage door's position is. With one, the guard holds it too, beside what a press asks.
  const askLevels = values.levels.filter(({ asks }) => asks);
  const guards = asked.length > 0 || askLevels.length > 0;
  // The keypad's verb phrase is the domain's core word (spec/cards.md → What every card says); the frame stays field's.
  const keypad = asked.length ? keypadWord(domain) : undefined;
  const codeWord = keypad && askLevels.length ? { ...keypad, expression: keypad.expression.replace("asked[guard.pending].label", "said(guard.pending).yes") } : keypad;
  const hold = guards ? "openPanel" : "details.openDetails";
  const andList = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
  /** What asks first, and what takes a code, in words: "Unlock and Open ask first, and Lock takes a code where the lock wants one". */
  const guardedWords = (() => {
    const verb = (xs, one, many) => `${andList(xs.map(({ action }) => labelOf(action)))} ${xs.length > 1 ? many : one}`;
    const asks = [...asked.filter(({ asks }) => asks).map(({ action }) => labelOf(action)), ...askLevels.map(({ field }) => `setting ${fieldWords(field).toLowerCase()}`)];
    const codes = asked.filter(({ asks }) => !asks);
    return [asks.length && `${andList(asks)} ${asks.length > 1 ? "ask" : "asks"} first, on the panel's question or keypad`, codes.length && `${verb(codes, "takes", "take")} a code where the ${words} wants one`].filter(Boolean).join(", and ");
  })();
  const keyLines = pressed.map(({ action, takes, asks, when }) => {
    const label = labelOf(action);
    if (asks && when) {
      const ifAsks = card.whenExpr(when);
      return `    <Key key="${action}" label={\`${label} \${e.name}\${${ifAsks} ? ": asks first" : ""}\`} unavailable={unav} onPress={() => (${ifAsks} ? ask("${keyOf(action)}") : void guard.attempt("${keyOf(action)}"))} onHold={${hold}} wide={wide} caption={wide && !unav ? "${label}" : undefined}><Icon${Name} /></Key>,`;
    }
    if (action === "onToggle" && toggle) return `    <Key key="${action}" label={e.name} pressed={on} unavailable={unav} onPress={() => ${action}?.()} onHold={${hold}} wide={wide} caption={wide && !unav ? (on ? "On" : "Off") : undefined}><Icon${Name} /></Key>,`;
    if (asks || takes === "code") return `    <Key key="${action}" label={\`${label} \${e.name}${asks ? ": asks first" : ""}\`} unavailable={unav} onPress={() => ${asks ? "ask" : "attempt"}("${keyOf(action)}")} onHold={${hold}} wide={wide} caption={wide && !unav ? "${label}" : undefined}><Icon${Name} /></Key>,`;
    return `    <Key key="${action}" label={\`${label} \${e.name}\`} unavailable={unav} onPress={() => ${action}?.()} onHold={${hold}} wide={wide} caption={wide && !unav ? "${label}" : undefined}><Icon${Name} /></Key>,`;
  });
  const askedKeys = asked.map(({ action }) => `"${keyOf(action)}"`);
  // What the guard holds: a press's key, or a level that asks with the value it would be set to.
  const actionKeys = [...askedKeys, ...(askLevels.length ? [`{ level: ${askLevels.map(({ field }) => `"${field}"`).join(" | ")}; value: number }`] : [])].join(" | ");
  const codeKeys = asked.filter(({ takes }) => takes === "code").map(({ action }) => `"${keyOf(action)}"`);
  const since = has("lastChanged") ? "sinceFact(e.lastChanged)" : "undefined";
  const small = smallPrint(has);
  // Today's summary in words, where the history counts the minutes in a state (`onMinutes`): "On 2h 36m", "Not on today".
  const minutesIn = domain.minutes;
  /** Today's meter at an indent, or nothing for a domain without history. */
  const todayAt = (indent) => history ? [
    "<Today",
    minutesIn ? `  summary={history && (unav ? "Unavailable" : todaySummary("${minutesIn}", history.${minutesIn}Minutes))}` : "",
    `  label="${Label} by hour today."`,
    '  tone="neutral"',
    domain.samples ? "  samples={history?.samples}" : "",
    "  currentHour={history?.currentHour}",
    "/>",
  ].filter(Boolean).map((line) => indent + line).join("\n") : "";
  const today = todayAt("      ");
  // The connected test's count: what one press of each key sends at once. What asks first sends nothing; what takes
  // a code sends only while the entity asks for none.
  const fixtureCode = !!fixture[fixtureId]?.attributes?.code_format;
  // One that asks only for some entities (its `when`) asks where the fixture's raw entity says so: its state, or the
  // attribute of the field's name (`deviceClass` is Home Assistant's `device_class`).
  const raw = (field) => (field === "state" ? fixture[fixtureId]?.state : fixture[fixtureId]?.attributes?.[field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)]);
  const fixtureAsks = (when) => Object.entries(when).every(([field, values]) => values.includes(raw(field)));
  const sentAtOnce = pressed.filter(({ takes, asks, when }) => !(asks && (!when || fixtureAsks(when))) && !(takes === "code" && fixtureCode)).length;
  // ---------- Values on field's parts ----------
  /**
   * A level as a fader. One that asks first (for the entities its `when` says) draws where it is slid and asks in the
   * panel once let go, its name marked as every field action that asks is.
   */
  const fader = ({ action, field, min, max, asks }, id) => {
    const at = asks ? `shown("${field}", e.${field} ?? ${bound(min)})` : `e.${field} ?? ${bound(min)}`;
    const set = asks
      ? `disabled={unav || (levels.${field}.asks && guard.pending != null)} valueText={${isPercent({ min, max }) ? `\`\${${at}} percent\`` : `String(${at})`}} onChange={(v) => (levels.${field}.asks ? setDraft({ level: "${field}", value: v }) : ${action}?.(v))} onCommit={levels.${field}.asks ? (v) => askLevel("${field}", v) : undefined}`
      : `disabled={unav} valueText={${isPercent({ min, max }) ? `\`\${${at}} percent\`` : `String(${at})`}} onChange={(v) => ${action}?.(v)}`;
    return `<Fader id={${id}} label={\`\${e.name} ${fieldWords(field).toLowerCase()}${asks ? `\${levels.${field}.asks ? ": asks first" : ""}` : ""}\`} legend="${fieldWords(field)}" value={unav ? undefined : ${at}} min={${bound(min)}} max={${bound(max)}} lit={${toggle ? "on" : "!unav"}} ${set} />`;
  };
  // The first level beside the one key, in the module's row and again in the panel; with more keys, in the panel.
  const [rowLevel, ...panelLevels] = pressed.length <= 1 ? values.levels : [undefined, ...values.levels];
  const choiceKeys = ({ action, field, options }) => {
    const list = Array.isArray(options) ? `([${options.map((o) => `"${o}"`).join(", ")}] as const)` : `(e.${options.field} ?? [])`;
    const group = [
      `<KeyGroup legend="${fieldWords(field)}" value={e.${field} ? optionWords(e.${field}) : undefined} columns={choices(${list}.length)} narrow={2}>`,
      `  {${list}.map((option) => <Key key={option} label={\`${fieldWords(field)} \${optionWords(option)}\`} wide caption={optionWords(option)} chosen={option === e.${field}} disabled={unav} onPress={() => ${action}?.(option)}>{null}</Key>)}`,
      "</KeyGroup>",
    ];
    return Array.isArray(options) ? group : [`{${list}.length > 0 && (`, ...group.map((line) => `  ${line}`), ")}"];
  };
  const switchKey = ({ action, field }) => [
    `<KeyGroup legend="${fieldWords(field)}" columns={2}>`,
    `  <Key label="${fieldWords(field)}" pressed={e.${field} === true} unavailable={unav || e.${field} == null} wide caption={unav || e.${field} == null ? undefined : e.${field} ? "On" : "Off"} onPress={() => ${action}?.(!e.${field})}>{null}</Key>`,
    "</KeyGroup>",
  ];
  const valueBlocks = [
    ...panelLevels.map((level) => [fader(level, `\`\${uid}-${level.field}\``)]),
    ...values.choices.map(choiceKeys),
    ...values.switches.map(switchKey),
  ].map((lines) => lines.map((line) => `      ${line}`).join("\n")).join("\n");
  /** What each value hands its handler, as the module's own prop type: it can't import the domain's handlers. */
  const handed = (action) => {
    if (values.levels.some((v) => v.action === action)) return "value: number";
    const choice = values.choices.find((v) => v.action === action);
    if (choice) return Array.isArray(choice.options) ? `value: ${choice.options.map((o) => `"${o}"`).join(" | ")}` : "value: string";
    return "value: boolean";
  };
  const valueParts = [values.choices.length && "choices", (rowLevel || panelLevels.length) && "Fader", rowLevel && "ModuleRow"].filter(Boolean);

  // A control's presses, in its stories and from its hook's actions. A demo that names a handler its own way leaves
  // that key unpressed.
  const demoProps = [...pressed.map(({ action }) => action), ...drawnValues].filter((action) => new RegExp(`\\b${action}\\b`).test(seeds)).map((action) => `${action}={demo.${action}}`).join(" ");
  const fill = filler({
    __DEMO__: hasHook ? `useDemo${Name}(seed)` : "seed",
    __demoImport__: hasHook ? `, useDemo${Name}` : "",
    // Its presses on a line of their own, gone for a reading.
    __demoProps__: demoProps,
    __liveProps__: [...pressed.map(({ action }) => action), ...drawnValues].map((action) => `${action}={actions.${action}}`).join(" "),
    __actions__: kind === "control" ? ", actions" : "",
    __about__: kind === "control"
      ? `${toggle ? "Press the key to switch it; its LED is lit while it's on." : "One key per action it takes."}${guardedWords ? ` ${guardedWords[0].toUpperCase()}${guardedWords.slice(1)}, so a press never does it alone.` : ""} Tap the name, or press and hold a key, for the detail panel${history ? " with today" : ""}.`
      : `A reading, so nothing on it is pressed: its glyph lies flat where a key would be${history ? ", and today's meter takes the fader's place" : ""}. Tap the name for the detail panel.`,
    __areaProp__: has("area") ? " area={e.area}" : "",
    // Since when it has been as it is, on the screen and in the panel's facts, where the entity says.
    __meta__: toggle ? (has("lastChanged") ? "e.lastChanged ? [sinceFact(e.lastChanged)] : undefined" : "undefined") : `[words(e.state), ${since}]`,
    // The panel's small print: when first, then what the device is where the entity says (spec/cards.md).
    __factsStart__: small.start,
    __factsEnd__: small.end ? `, end: ${small.end}` : "",
    __batteryImport__: small.battery ? `\nimport { batteryText } from "${packageSpecifier("core", "entities/battery")}";` : "",
    // The facts' words, from core: what this module prints, and a control's since when on its screen.
    __factsImport__: [...new Set([...small.facts, ...(has("lastChanged") ? ["sinceFact"] : [])])].sort().join(", "),
    __readingFactsImport__: [...small.facts].sort().join(", "),
    // Today's meter, from the history's hourly samples where it has them; dark until the author wires it otherwise.
    __samplesProp__: domain.samples ? "samples={history?.samples}" : "",
    __historyType__: history ? `, ${Name}History` : "",
    __historyProp__: history ? "  /** Today, for the detail panel. Omit to leave its meter dark. */\n  history?: " + `${Name}History;` : "",
    __historyArg__: history ? ", history" : "",
    __historyLive__: history ? "      history={history}" : "",
    __historyDemo__: history ? "        history={demo.history}" : "",
    __historyDestructure__: history ? ", history" : "",
    __loadHistory__: history ? " loadHistory={false}" : "",
    __todayImport__: history ? "Today, " : "",
    __todaySummaryImport__: minutesIn ? `\nimport { todaySummary } from "${packageSpecifier("core", "entities/today")}";` : "",
    __todayBlock__: today,
    __readingToday__: history ? "{today}" : "",
    __readingTodayConst__: history ? ["  const today = (", todayAt("    "), "  );"].join("\n") : "",
    __onConst__: toggle ? '  const on = e.state === "on";' : "",
    __lit__: toggle ? "on" : "!unav",
    __read__: toggle ? 'on ? "ON" : "OFF"' : "<Blank label={words(e.state)} />",
    __keys__: keyLines.join("\n"),
    __actionProps__: pressed.map(({ action, takes, asks }) => `  /** ${asks ? "Asks first: the panel's question, or its keypad where the entity wants a code. Never one press." : takes === "code" ? "A press does it, asking for the code where the entity wants one." : "A press does it."} */\n  ${action}?: (${takes === "code" ? "code?: string" : ""}) => ${asks || takes === "code" ? "GuardedResult" : "void"};`).join("\n"),
    __actionArgs__: [...pressed.map(({ action }) => action), ...drawnValues].map((action) => `, ${action}`).join(""),
    __partsImport__: guards ? `Confirm, ${codeWord ? "Keypad, " : ""}` : "",
    __valuesProps__: drawnValues.map((action) => `  /** Drawn from its declaration (\`${CONST}_ACTIONS\`). */\n  ${action}?: (${handed(action)}) => void;`).join("\n"),
    __valuePartsImport__: valueParts.map((part) => `${part}, `).join(""),
    __reactImport__: rowLevel || panelLevels.length ? `import { ${askLevels.length ? "useId, useState" : "useId"} } from "react";` : "",
    __uidConst__: rowLevel || panelLevels.length ? "  const uid = useId();" : "",
    __controlsConst__: rowLevel ? [
      `  // The key and its ${fieldWords(rowLevel.field).toLowerCase()} fader, the same in the module and the panel. Unavailable, the fader goes and the key`,
      "  // spans the row, as every field control's does.",
      "  const controls = (where: \"m\" | \"p\") => (",
      `    <ModuleRow className="fd-${code}-row" solo={unav}>`,
      "      {keys(unav)[0]}",
      `      {!unav && ${fader(rowLevel, "`${uid}-${where}`")}}`,
      "    </ModuleRow>",
      "  );",
    ].join("\n") : "",
    __rowProp__: rowLevel ? "controls={controls}" : "row={<KeyGroup label={e.name}>{keys(true)}</KeyGroup>}",
    __panelKeys__: [rowLevel ? "" : '      <KeyGroup legend="__Label__">{keys(true)}</KeyGroup>',
      // What asks first, said once in the panel while no question stands, in core's words (spec/cards.md → What every card says).
      asked.some(({ asks }) => asks) || askLevels.length ? "      {!unav && hint && <p className=\"fd-hint\">{hint}</p>}" : ""].filter(Boolean).join("\n"),
    __valueBlocks__: valueBlocks,
    __optionWordsConst__: values.choices.length ? '/** An option in words: "deep_sleep" becomes "Deep sleep". */\nconst optionWords = (option: string) => { const spaced = option.replace(/[_-]+/g, " "); return spaced[0].toUpperCase() + spaced.slice(1); };\n' : "",
    __guardImports__: guards ? [
      `import { ACTION_FAILED, ASKS_DETAIL${asked.some(({ asks }) => asks) || askLevels.length ? ", asksFirst" : ""}${askLevels.length ? ", levelAction, levelQuestion" : ""} } from "${packageSpecifier("core", "entities/guard")}";`,
      `import { useGuardedAction } from "${packageSpecifier("core", "primitives")}";`,
      asked.length && `import type { GuardedResult } from "${packageSpecifier("core", "primitives")}";`,
      codeWord?.import,
    ].filter(Boolean).join("\n") : "",
    __defaultActionProp__: guards ? `  /** Open the detail panel on this action's question or keypad${askLevels.length ? ", a level on the value it would be set to" : ""} (stories). */\n  defaultAction?: ${actionKeys};` : "",
    __defaultActionArg__: guards ? ", defaultAction" : "",
    __defaultActionOpen__: guards ? " || defaultAction != null" : "",
    __guardBlock__: guards ? [
      "  // What asks first, or takes a code, is answered in the panel: its question, or its keypad where the entity wants one.",
      ...(asked.length ? [
        `  const asked: Record<${askedKeys.join(" | ")}, { label: string; run?: (code?: string) => GuardedResult }> = {`,
        ...asked.map(({ action }) => `    "${keyOf(action)}": { label: "${labelOf(action)}", run: ${action} },`),
        "  };",
      ] : []),
      ...(askLevels.length ? [
        "  // A level that asks first is set, then asked where `asks` says: its words, a value in words, and what sets it.",
        "  const levels = {",
        ...askLevels.map((level) => `    ${level.field}: { words: "${fieldWords(level.field)}", text: (v: number) => ${isPercent(level) ? "`${v}%`" : "String(v)"}, asks: ${level.when ? card.whenExpr(level.when) : "true"}, run: ${level.action} },`),
        "  };",
      ] : []),
      `  const guard = useGuardedAction<${askLevels.length ? `NonNullable<${Name}ModuleProps["defaultAction"]>` : "keyof typeof asked"}>({`,
      `    run: ${!askLevels.length ? "(a, code) => asked[a].run?.(code)" : asked.length ? "(a, code) => (typeof a === \"string\" ? asked[a].run?.(code) : levels[a.level].run?.(a.value))" : "(a) => levels[a.level].run?.(a.value)"},`,
      `    needsCode: (a) => ${wantsCode && codeKeys.length ? `${askLevels.length ? "typeof a === \"string\" && " : ""}([${codeKeys.join(", ")}] as string[]).includes(a) && !!e.codeFormat` : "false"},`,
      `    settled: ${askLevels.length ? `(a) => unav || (${asked.length ? "typeof a !== \"string\" && " : ""}e[a.level] === a.value)` : "() => unav"},`,
      "    initial: defaultAction,",
      "  });",
      "  const openPanel = () => { guard.close(); details.openDetails(); };",
      ...(asked.some(({ asks }) => asks) || askLevels.length ? [`  const hint = asksFirst([${[...asked.filter(({ asks }) => asks).map(({ action, when }) => `${when ? `${card.whenExpr(when)} && ` : ""}"${labelOf(action)}"`), ...askLevels.map((level) => `${level.when ? `${card.whenExpr(level.when)} && ` : ""}"Setting ${fieldWords(level.field).toLowerCase()}"`)].join(", ")}]);`] : []),
      ...(asked.some(({ asks }) => asks) || askLevels.length ? [`  const ask = (a: ${askLevels.length ? "NonNullable<typeof defaultAction>" : "keyof typeof asked"}) => { guard.ask(a); details.openDetails(); };`] : []),
      // A tap that takes a code: done at once, or the panel opens on the keypad where the entity wants a code (asked, or refused).
      ...(asked.some(({ asks }) => !asks) ? ["  const attempt = (a: keyof typeof asked) => { void guard.attempt(a).then((result) => { if (result === undefined || result === \"wrong_code\") details.openDetails(); }); };"] : []),
      ...(askLevels.length ? [
        `  const said = (a: NonNullable<typeof defaultAction>) => (${asked.length ? "typeof a === \"string\" ? { question: `${asked[a].label} ${e.name}?`, yes: asked[a].label } : " : ""}{ question: levelQuestion(e.name, levels[a.level].words, levels[a.level].text(a.value)), yes: levelAction(levels[a.level].text(a.value)) });`,
        "  // Its fader draws where it is slid and asks once let go, a press at once; while the question stands it shows where it",
        "  // would go and takes no press, so the second press of a double press can't ask again, and on Cancel it is back where it is.",
        "  const [draft, setDraft] = useState<{ level: keyof typeof levels; value: number } | null>(null);",
        `  const asking = ${asked.length ? "guard.pending != null && typeof guard.pending !== \"string\" ? guard.pending : null" : "guard.pending"};`,
        "  const shown = (level: keyof typeof levels, at: number) => (draft?.level === level ? draft.value : asking?.level === level ? asking.value : at);",
        "  const askLevel = (level: keyof typeof levels, v: number) => { setDraft(null); if (v !== e[level]) ask({ level, value: v }); };",
      ] : []),
    ].join("\n") : "",
    __leftOut__: leftOut.length ? `  // Left out: ${card.leftOutWhy(leftOut, domain.runs, "field's own control (a fader, a key group)")}.` : "",
    __panelFocus__: guards ? ' panelFocus={guard.pending ? "content" : undefined}' : "",
    __details__: guards ? "{ ...details, openDetails: openPanel }" : "details",
    __factsWhen__: guards ? "guard.pending ? undefined : " : "",
    __panelBody__: guards ? (() => {
      const question = askLevels.length ? "said(guard.pending).question" : "`${asked[guard.pending].label} ${e.name}?`";
      const yes = askLevels.length ? "said(guard.pending).yes" : "asked[guard.pending].label";
      const confirm = `<Confirm key={guard.pendingKey} question={${question}} detail={ASKS_DETAIL} action={${yes}} actionLabel={\`\${${yes}}, \${e.name}\`} icon={<Icon${Name} />} busy={guard.busy} error={guard.failed ? ACTION_FAILED : null} onConfirm={() => void guard.confirm()} onCancel={guard.close} />`;
      return codeWord ? [
        "      {guard.pending ? (guard.code",
        `        ? <Keypad key={guard.pendingKey} prompt={\`Code to \${${codeWord.expression}}\`} text={${wantsCode ? 'e.codeFormat === "text"' : "false"}} onSubmit={guard.submit} onCancel={guard.close} />`,
        `        : ${confirm}`,
        "      ) : panel}",
      ].join("\n") : [
        "      {guard.pending ? (",
        `        ${confirm}`,
        "      ) : panel}",
      ].join("\n");
    })() : "      {panel}",
    __guardedAbout__: guardedWords ? `; ${guardedWords}, never one press` : "",
    __wordsConst__: toggle ? "" : '/** A state as words: "deep_sleep" becomes "deep sleep". */\nconst words = (state: string) => state.replace(/[_-]+/g, " ");\n',
    // The module test's presses: each action once, and what asks first never on one press.
    __vi__: pressed.length ? ", vi" : "",
    __testHandlers__: pressed.map(({ action }) => `${action}: vi.fn()`).join(", "),
    __testExpect__: pressed.map(({ action, takes, asks, when }) => asks
      ? (when ? (seedAsks(firstSeed, when) ? `    expect(handlers.${action}, "${labelOf(action)} asks first here: never one press").not.toHaveBeenCalled();` : `    expect(handlers.${action}).toHaveBeenCalledTimes(1);`)
        : `    expect(handlers.${action}, "${labelOf(action)} asks first: never one press").not.toHaveBeenCalled();`)
      : takes === "code" ? "" : `    expect(handlers.${action}).toHaveBeenCalledTimes(1);`).filter(Boolean).join("\n"),
    __sentAtOnce__: String(sentAtOnce),
    // What asks first opens the panel on its question (or keypad), and a press alone never does it.
    __guardedTest__: (() => {
      // An action that always asks, on the first seed; else one that asks only for some entities, on a seed it asks for.
      const first = [...pressed.filter(({ asks, when }) => asks && !when).map((p) => ({ ...p, seed: firstSeed })),
        ...pressed.filter(({ asks, when }) => asks && when).map((p) => ({ ...p, seed: seedKeys.map(({ key }) => key).find((key) => seedAsks(key, p.when)) }))].find(({ seed }) => seed);
      if (!first) return "";
      return [
        `  it("opens the panel on ${labelOf(first.action)}'s question or keypad, and doesn't ${labelOf(first.action).toLowerCase()} on the press", () => {`,
        `    const { keys, handlers } = draw("${first.seed}");`,
        `    fireEvent.click(keys.find((key) => key.getAttribute("aria-label")?.startsWith("${labelOf(first.action)} "))!);`,
        `    expect(handlers.${first.action}).not.toHaveBeenCalled();`,
        '    expect(document.querySelector(".fd-cf, .fd-pad")).not.toBeNull();',
        "  });",
        "",
      ].join("\n");
    })(),
    __seeds__: packageSpecifier("core", `seeds/${name}`),
    __firstSeed__: firstSeed, __firstSeedWords__: seedWords(firstSeed),
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
  // Foundations → Worst case: its worst-case seeds beside every other module's (verify/storybook.test.ts), on its demo
  // state as in its own stories.
  const worstCase = seams.field.worstCase;
  edit(worstCase, after(markers.worstCaseImports, fill(`import { __Name__Module } from "../cards/__name__/__Name__Module";
import { __CONST___SEEDS, __CONST___WORST_CASE__demoImport__ } from "__seeds__";
import type { __Name__Seed } from "__seeds__";
`)));
  edit(worstCase, after(markers.worstCaseModules, fill(`
function __Name__({ seed, footprint }: { seed: __Name__Seed; footprint: FieldFootprint }) {
  const demo = __DEMO__;
  return <__Name__Module entity={demo.entity}${history ? " history={demo.history}" : ""}${demoProps ? ` ${demoProps}` : ""} footprint={footprint} />;
}
`)));
  edit(worstCase, after(markers.worstCases, fill(`  card("__Name__", __CONST___WORST_CASE, [__CONST___SEEDS.__firstSeed__], (seed, footprint) => <__Name__ seed={seed} footprint={footprint} />),`)));

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
  edit(config, after(markers.fieldKinds, `  ${name}: { domains: [${domains.map((d) => `"${d}"`).join(", ")}]${domain.id ? `, id: ${domain.id}` : ""} },`));
  const dashboard = seams.field.dashboard;
  edit(dashboard, after(markers.moduleImports, `import { Ha${Name}Module } from "../ha/Ha${Name}Module";\n`));
  // The module's own name and area, and whether it reads today, where the hook takes them (YAML `history` is `loadHistory`).
  const passed = domain.options
    .map((key) => key === "loadHistory" ? " loadHistory={item.history}" : ` ${key}={item.${key}}`).join("");
  edit(dashboard, after(markers.liveModules, `  ${name}: (item, footprint) => <Ha${Name}Module entityId={item.entity}${passed} footprint={footprint} />,`));
  const listed = read(seams.deployDoc).match(/^\| `cards` \| a list of ([^|]*?) entity ids/m)?.[1] ?? "";
  if (domains.some((d) => !listed.includes(`\`${d}.*\``))) edit(seams.deployDoc, (s) => s.replace(/^(\| `cards` \| a list of )([^|]*?)( entity ids)/m, (_, head, list, tail) => {
    const all = [...new Set([...[...list.matchAll(/`(\w+)\.\*`/g)].map((m) => m[1]), ...domains])].map((d) => `\`${d}.*\``);
    return `${head}${all.slice(0, -1).join(", ")} or ${all.at(-1)}${tail}`;
  }));

  // ---------- Write ----------
  if (!change.commit(dryRun)) return;
  console.log(`Drew ${words} in field as a ${kind} (fd-${code}-, ${domains.map((d) => `${d}.*`).join(", ")}), on the seeds in ${seedPath}.${kind === "control" ? `\nKeys: ${pressed.map(({ action, asks, takes }) => `${action}${asks ? " (asks first)" : takes === "code" ? " (takes a code)" : ""}`).join(", ")}.` : ""}${kind === "control" && leftOut.length ? `\nLeft out: ${card.leftOutWhy(leftOut, domain.runs, "field's own control")}.` : ""}

Next:
  1. npm run storybook  →  Field/Cards/${Name} and Field/Connected/${Name}
  2. Make it the ${words}: its screen and ${kind === "control" ? "panel controls" : "figure"} in ${SKIN}/cards/${name}/${Name}Module.tsx (spec/field.md → Design rules)
  3. Draw its glyph and pictogram in ${SKIN}/cards/${name}/icons.tsx
  4. Finish "## ${Label}" in spec/field.md and "### Field ${words} module" in spec/cards.md,
     and name ${words} where spec/deploy.md lists what field draws${domain.shared ? `
  5. ${domains.join(", ")} already has a field card, so a module picks this one with \`card: ${name}\`` : ""}
  ${domain.shared ? 6 : 5}. npm run check && npm run test-storybook`);
}

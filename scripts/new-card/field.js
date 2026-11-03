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
 *     the panel on the skin's Confirm or Keypad instead, never one tap. An action that takes a value is left out,
 *     saying so. The default when the domain has one.
 *   - reading: the glyph on a flat plate and today's meter, nothing pressed. The default when it has none.
 * Today's meter is drawn only for a domain with a `<Name>History`: a lock's day is its last change.
 * Nothing is written unless every file and every registration can be made.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { markers, packageFile, packageSpecifier } from "../packages.js";
import { after, before, changes, exists, fail, filler, names, orbKinds, read, root, seams, skinDir } from "./lib.js";
import { declaredActions } from "../domains.js";

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
  if (!entity) fail(`${typesPath} must export ${Name}Entity`);

  const hookPath = packageFile("core", `src/ha/hooks/${name}.ts`);
  if (!exists(hookPath)) fail(`${hookPath} doesn't exist: field reaches Home Assistant through useHa${Name} (${step(1)})`);
  const hook = read(hookPath);
  const options = shape(hook, `Ha${Name}Options`);
  if (!new RegExp(`export function useHa${Name}\\b`).test(hook) || options == null) fail(`${hookPath} must export useHa${Name} and Ha${Name}Options`);
  const required = [...options.matchAll(/^\s+(\w+): /gm)].map((m) => m[1]);
  if (required.length) fail(`useHa${Name} requires ${required.join(", ")}, which a generated module can't know. Draw ${words} in field by hand, from ${SKIN}/cards/light/`);

  // What each action is, as the domain declares it beside its handlers: never guessed from a signature.
  const actionsPath = packageFile("core", `src/ha/actions/${name}.ts`);
  let declared = [];
  try {
    declared = exists(actionsPath) ? declaredActions(read(actionsPath), Name, CONST) : [];
  } catch (error) {
    fail(`${error.message} (${actionsPath})`);
  }
  const taps = declared.filter(({ takes, asks }) => takes === "nothing" && !asks);
  const asked = declared.filter(({ takes, asks }) => takes === "code" || (takes === "nothing" && asks));
  const leftOut = declared.filter(({ takes }) => takes === "value").map(({ action }) => action);
  const kind = askedKind ?? (taps.length || asked.length ? "control" : "reading");
  if (kind !== "control" && kind !== "reading") fail(`kind "${kind}" must be "control" or "reading"`);
  if (kind === "control" && !taps.length && !asked.length) {
    fail(`${words} has no action a press can give${leftOut.length ? ` (${leftOut.join(", ")} take${leftOut.length > 1 ? "" : "s"} a value)` : ` (${actionsPath})`}, so it starts as a reading: pass --kind reading and add its controls by hand, or draw it from ${SKIN}/cards/light/`);
  }
  const pressed = kind === "control" ? [...taps, ...asked] : [];

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
  const firstSeed = seedKeys.find((_, i) => !/state: "unavailable"/.test(seedText(i)))?.key;
  if (!unavailableSeed || !firstSeed) fail(`${CONST}_SEEDS needs an unavailable example and an available one, for the Unavailable and default stories`);

  const orbStory = exists(`${ORB}/ha/Ha${Name}Tile.stories.tsx`) ? read(`${ORB}/ha/Ha${Name}Tile.stories.tsx`) : "";
  const transport = orbStory.match(/import \{ (createDemo\w+HaTransport)\b[^}]*\} from "(@dashhaus\/core\/demo)"/);
  const entityId = orbStory.match(/entityId="([^"]+)"/)?.[1];
  if (!transport || !entityId) fail(`${ORB}/ha/Ha${Name}Tile.stories.tsx must import a createDemo…HaTransport and draw an entityId, for field's connected story`);

  const fixturePath = packageFile("core", `src/ha/fixtures/${name}.json`);
  if (!exists(fixturePath)) fail(`${fixturePath} doesn't exist, for its connected module's test`);
  const fixture = JSON.parse(read(fixturePath));
  const fixtureId = Object.entries(fixture).find(([, e]) => !["unavailable", "unknown"].includes(e.state))?.[0];
  if (!fixtureId) fail(`${fixturePath} has no available entity for its connected module's test`);

  // The Home Assistant domains it draws, as orb's Lovelace card has them.
  const orb = orbKinds();
  const shared = orb.shared[name];
  const domains = shared?.domains ?? Object.keys(orb.domainKind).filter((d) => orb.domainKind[d] === name);
  if (!domains.length) fail(`${orb.path} gives ${name} no domain in DOMAIN_KIND or SHARED_KINDS`);

  // ---------- Files from the templates ----------
  const has = (field) => new RegExp(`^\\s+${field}\\??: `, "m").test(entity);
  const toggle = taps.some(({ action }) => action === "onToggle") && /^\s+state: [^;]*"on"/m.test(entity);
  const wantsCode = has("codeFormat");
  const keyOf = (action) => action.replace(/^on/, "").replace(/[A-Z]/g, (c, at) => `${at ? "-" : ""}${c.toLowerCase()}`);
  const labelOf = (action) => {
    const spaced = action.replace(/^on/, "").replace(/([A-Z])/g, " $1").trim().toLowerCase().replace(/ cover$/, "");
    return spaced[0].toUpperCase() + spaced.slice(1);
  };
  const hold = asked.length ? "openPanel" : "details.openDetails";
  const andList = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
  /** What asks first, and what takes a code, in words: "Unlock and Open ask first, and Lock takes a code where the lock wants one". */
  const guardedWords = (() => {
    const verb = (xs, one, many) => `${andList(xs.map(({ action }) => labelOf(action)))} ${xs.length > 1 ? many : one}`;
    const asks = asked.filter(({ asks }) => asks);
    const codes = asked.filter(({ asks }) => !asks);
    return [asks.length && `${verb(asks, "asks", "ask")} first, on the panel's question or keypad`, codes.length && `${verb(codes, "takes", "take")} a code where the ${words} wants one`].filter(Boolean).join(", and ");
  })();
  const keyLines = pressed.map(({ action, takes, asks }) => {
    const label = labelOf(action);
    if (action === "onToggle" && toggle) return `    <Key key="${action}" label={e.name} pressed={on} unavailable={unav} onPress={() => ${action}?.()} onHold={${hold}} wide={wide} caption={wide && !unav ? (on ? "On" : "Off") : undefined}><Icon${Name} /></Key>,`;
    if (asks || takes === "code") return `    <Key key="${action}" label={\`${label} \${e.name}${asks ? ": asks first" : ""}\`} unavailable={unav} onPress={() => ${asks ? "ask" : "attempt"}("${keyOf(action)}")} onHold={${hold}} wide={wide} caption={wide && !unav ? "${label}" : undefined}><Icon${Name} /></Key>,`;
    return `    <Key key="${action}" label={\`${label} \${e.name}\`} unavailable={unav} onPress={() => ${action}?.()} onHold={${hold}} wide={wide} caption={wide && !unav ? "${label}" : undefined}><Icon${Name} /></Key>,`;
  });
  const askedKeys = asked.map(({ action }) => `"${keyOf(action)}"`);
  const codeKeys = asked.filter(({ takes }) => takes === "code").map(({ action }) => `"${keyOf(action)}"`);
  const since = has("lastChanged") ? "sinceFact(e.lastChanged)" : "undefined";
  // Today's summary in words, where the history counts the minutes in a state (`onMinutes`): "On 2h 36m", "Not on today".
  const minutesIn = history?.match(/^\s+(\w+)Minutes\??: number/m)?.[1];
  /** Today's meter at an indent, or nothing for a domain without history. */
  const todayAt = (indent) => history ? [
    "<Today",
    minutesIn ? `  summary={history && (unav ? "Unavailable" : todaySummary("${minutesIn}", history.${minutesIn}Minutes))}` : "",
    `  label="${Label} by hour today."`,
    '  tone="neutral"',
    /^\s+samples: /m.test(history) ? "  samples={history?.samples}" : "",
    "  currentHour={history?.currentHour}",
    "/>",
  ].filter(Boolean).map((line) => indent + line).join("\n") : "";
  const today = todayAt("      ");
  // The connected test's count: what one press of each key sends at once. What asks first sends nothing; what takes
  // a code sends only while the entity asks for none.
  const fixtureCode = !!fixture[fixtureId]?.attributes?.code_format;
  const sentAtOnce = pressed.filter(({ takes, asks }) => !asks && !(takes === "code" && fixtureCode)).length;
  const fill = filler({
    __DEMO__: hasHook ? `useDemo${Name}(seed)` : "seed",
    __demoImport__: hasHook ? `, useDemo${Name}` : "",
    // A control's presses, in its stories and from its hook's actions; a line of their own, gone for a reading. A
    // demo that names a handler its own way leaves that key unpressed.
    __demoProps__: pressed.filter(({ action }) => new RegExp(`\\b${action}\\b`).test(seeds)).map(({ action }) => `${action}={demo.${action}}`).join(" "),
    __liveProps__: pressed.map(({ action }) => `${action}={actions.${action}}`).join(" "),
    __actions__: kind === "control" ? ", actions" : "",
    __about__: kind === "control"
      ? `${toggle ? "Press the key to switch it; its LED is lit while it's on." : "One key per action it takes."}${guardedWords ? ` ${guardedWords[0].toUpperCase()}${guardedWords.slice(1)}, so a press never does it alone.` : ""} Tap the name, or press and hold a key, for the detail panel${history ? " with today" : ""}.`
      : `A reading, so nothing on it is pressed: its glyph lies flat where a key would be${history ? ", and today's meter takes the fader's place" : ""}. Tap the name for the detail panel.`,
    __areaProp__: has("area") ? " area={e.area}" : "",
    // Since when it has been as it is, on the screen and in the panel's facts, where the entity says.
    __meta__: toggle ? (has("lastChanged") ? "e.lastChanged ? [sinceFact(e.lastChanged)] : undefined" : "undefined") : `[words(e.state), ${since}]`,
    __changed__: has("lastChanged") ? "lastChangedFact(e.lastChanged)" : "\"\"",
    // The facts' words, from core: what this module prints.
    __factsImport__: ["lastSeenFact", ...(has("lastChanged") ? ["lastChangedFact", "sinceFact"] : [])].sort().join(", "),
    // Today's meter, from the history's hourly samples where it has them; dark until the author wires it otherwise.
    __samplesProp__: history && /^\s+samples: /m.test(history) ? "samples={history?.samples}" : "",
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
    __actionArgs__: pressed.map(({ action }) => `, ${action}`).join(""),
    __partsImport__: asked.length ? "Confirm, Keypad, " : "",
    __guardImports__: asked.length ? `import { useGuardedAction } from "${packageSpecifier("core", "primitives")}";\nimport type { GuardedResult } from "${packageSpecifier("core", "primitives")}";` : "",
    __defaultActionProp__: asked.length ? `  /** Open the detail panel on this action's question or keypad (stories). */\n  defaultAction?: ${askedKeys.join(" | ")};` : "",
    __defaultActionArg__: asked.length ? ", defaultAction" : "",
    __defaultActionOpen__: asked.length ? " || defaultAction != null" : "",
    __guardBlock__: asked.length ? [
      "  // What asks first, or takes a code, is answered in the panel: its question, or its keypad where the entity wants one.",
      `  const asked: Record<${askedKeys.join(" | ")}, { label: string; run?: (code?: string) => GuardedResult }> = {`,
      ...asked.map(({ action }) => `    "${keyOf(action)}": { label: "${labelOf(action)}", run: ${action} },`),
      "  };",
      `  const guard = useGuardedAction<keyof typeof asked>({`,
      "    run: (a, code) => asked[a].run?.(code),",
      `    needsCode: (a) => ${wantsCode && codeKeys.length ? `([${codeKeys.join(", ")}] as string[]).includes(a) && !!e.codeFormat` : "false"},`,
      "    settled: () => unav,",
      "    initial: defaultAction,",
      "  });",
      "  const openPanel = () => { guard.close(); details.openDetails(); };",
      ...(asked.some(({ asks }) => asks) ? ["  const ask = (a: keyof typeof asked) => { guard.ask(a); details.openDetails(); };"] : []),
      // A tap that takes a code: done at once, or the panel opens on the keypad where the entity wants a code (asked, or refused).
      ...(asked.some(({ asks }) => !asks) ? ["  const attempt = (a: keyof typeof asked) => { void guard.attempt(a).then((result) => { if (result === undefined || result === \"wrong_code\") details.openDetails(); }); };"] : []),
    ].join("\n") : "",
    __leftOut__: leftOut.length ? `  // Left out: ${leftOut.join(", ")} take${leftOut.length > 1 ? "" : "s"} a value a press can't give; draw ${leftOut.length > 1 ? "them" : "it"} with field's own control (a fader, a key group).` : "",
    __panelFocus__: asked.length ? ' panelFocus={guard.pending ? "content" : undefined}' : "",
    __details__: asked.length ? "{ ...details, openDetails: openPanel }" : "details",
    __panelBody__: asked.length ? [
      "        {guard.pending ? (guard.code",
      `          ? <Keypad key={guard.pendingKey} prompt={\`Code to \${asked[guard.pending].label.toLowerCase()}\`} text={${wantsCode ? 'e.codeFormat === "text"' : "false"}} onSubmit={guard.submit} onCancel={guard.close} />`,
      `          : <Confirm key={guard.pendingKey} question={\`\${asked[guard.pending].label} \${e.name}?\`} detail="It asks first, so a stray press never does it." action={asked[guard.pending].label} actionLabel={\`\${asked[guard.pending].label}, \${e.name}\`} icon={<Icon${Name} />} busy={guard.busy} error={guard.failed ? "Didn’t go through. Try again" : null} onConfirm={() => void guard.confirm()} onCancel={guard.close} />`,
      "        ) : panel}",
    ].join("\n") : "        {panel}",
    __guardedAbout__: guardedWords ? `; ${guardedWords}, never one press` : "",
    __wordsConst__: toggle ? "" : '/** A state as words: "deep_sleep" becomes "deep sleep". */\nconst words = (state: string) => state.replace(/[_-]+/g, " ");\n',
    // The module test's presses: each action once, and what asks first never on one press.
    __vi__: pressed.length ? ", vi" : "",
    __testHandlers__: pressed.map(({ action }) => `${action}: vi.fn()`).join(", "),
    __testExpect__: pressed.map(({ action, takes, asks }) => asks
      ? `    expect(handlers.${action}, "${labelOf(action)} asks first: never one press").not.toHaveBeenCalled();`
      : takes === "code" ? "" : `    expect(handlers.${action}).toHaveBeenCalledTimes(1);`).filter(Boolean).join("\n"),
    __sentAtOnce__: String(sentAtOnce),
    // What asks first opens the panel on its question (or keypad), and a press alone never does it.
    __guardedTest__: (() => {
      const first = pressed.find(({ asks }) => asks);
      if (!first) return "";
      return [
        `  it("opens the panel on ${labelOf(first.action)}'s question or keypad, and doesn't ${labelOf(first.action).toLowerCase()} on the press", () => {`,
        `    const { keys, handlers } = draw("${firstSeed}");`,
        `    fireEvent.click(keys.find((key) => key.getAttribute("aria-label")?.startsWith("${labelOf(first.action)} "))!);`,
        `    expect(handlers.${first.action}).not.toHaveBeenCalled();`,
        '    expect(document.querySelector(".fd-cf, .fd-pad")).not.toBeNull();',
        "  });",
        "",
      ].join("\n");
    })(),
    __seeds__: packageSpecifier("core", `seeds/${name}`),
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
  // The module's own name and area, and whether it reads today, where the hook takes them (YAML `history` is `loadHistory`).
  const passed = ["name", "area", "loadHistory"].filter((key) => new RegExp(`^\\s+${key}\\?: `, "m").test(options))
    .map((key) => key === "loadHistory" ? " loadHistory={item.history}" : ` ${key}={item.${key}}`).join("");
  edit(dashboard, after(markers.liveModules, `  ${name}: (item, footprint) => <Ha${Name}Module entityId={item.entity}${passed} footprint={footprint} />,`));
  const listed = read(seams.deployDoc).match(/^\| `cards` \| a list of ([^|]*?) entity ids/m)?.[1] ?? "";
  if (domains.some((d) => !listed.includes(`\`${d}.*\``))) edit(seams.deployDoc, (s) => s.replace(/^(\| `cards` \| a list of )([^|]*?)( entity ids)/m, (_, head, list, tail) => {
    const all = [...new Set([...[...list.matchAll(/`(\w+)\.\*`/g)].map((m) => m[1]), ...domains])].map((d) => `\`${d}.*\``);
    return `${head}${all.slice(0, -1).join(", ")} or ${all.at(-1)}${tail}`;
  }));

  // ---------- Write ----------
  if (!change.commit(dryRun)) return;
  console.log(`Drew ${words} in field as a ${kind} (fd-${code}-, ${domains.map((d) => `${d}.*`).join(", ")}), on the seeds in ${seedPath}.${kind === "control" ? `\nKeys: ${pressed.map(({ action, asks, takes }) => `${action}${asks ? " (asks first)" : takes === "code" ? " (takes a code)" : ""}`).join(", ")}.` : ""}${kind === "control" && leftOut.length ? `\nLeft out ${leftOut.join(", ")}: ${leftOut.length > 1 ? "they take values" : "it takes a value"} a press can't give.` : ""}

Next:
  1. npm run storybook  →  Field/Cards/${Name} and Field/Connected/${Name}
  2. Make it the ${words}: its screen and ${kind === "control" ? "panel controls" : "figure"} in ${SKIN}/cards/${name}/${Name}Module.tsx (spec/field.md → Design rules)
  3. Draw its glyph and pictogram in ${SKIN}/cards/${name}/icons.tsx
  4. Finish "## ${Label}" in spec/field.md and "### Field ${words} module" in spec/cards.md,
     and name ${words} where spec/deploy.md lists what field draws${shared ? `
  5. ${domains.join(", ")} already has a field card, so a module picks this one with \`card: ${name}\`` : ""}
  ${shared ? 6 : 5}. npm run check && npm run test-storybook`);
}

/**
 * One domain's card, written the same way wherever a skin lives: this package's `add` command for a skin outside the
 * Dashhaus repository, and the repository's `new-card --skin <skin>` for a skin inside it. A domain is described once,
 * in `domains.json` (the repository writes it from @dashhaus/core's sources), and everything a card's templates need is
 * computed from that description here.
 */

/** Replace every token in a text. A line a token empties is dropped, so an optional prop can stand on its own line. */
export const filler = (tokens) => (text) => text
  .split("\n")
  .flatMap((line) => {
    const filled = Object.entries(tokens).reduce((source, [token, value]) => source.replaceAll(token, value), line);
    return filled.trim() === "" && line.trim() !== "" ? [] : [filled];
  })
  .join("\n");

const capital = (part) => part[0].toUpperCase() + part.slice(1);

/** A skin's name in every form the templates use: `my-skin` → `MySkin`, `My Skin`, `mySkin`, `MY_SKIN`. */
export function skinNames(skin) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(skin)) throw new Error(`"${skin}" must be lower-case kebab-case, like "my-skin"`);
  const parts = skin.split("-");
  return {
    skin,
    Skin: parts.map(capital).join(""),
    Section: parts.map(capital).join(" "),
    skinVar: parts[0] + parts.slice(1).map(capital).join(""),
    SKIN_CONST: parts.join("_").toUpperCase(),
  };
}

/** The skin's own tokens, for its core templates. */
export const skinTokens = ({ skin, Skin, Section, skinVar, SKIN_CONST }) => ({
  __skin__: skin,
  __Skin__: Skin,
  __skinVar__: skinVar,
  __Section__: Section,
  __SKIN_CONST__: SKIN_CONST,
  __card_type__: `dashhaus-${skin}`,
});

const wordsOf = (action) => action.replace(/^on/, "").replace(/([A-Z])/g, " $1").trim().toLowerCase();
/** A button's words for an action: `onToggle` → "Toggle", `onOpenCover` → "Open". */
export const labelOf = (action) => {
  const words = wordsOf(action).replace(/ cover$/, "");
  return words[0].toUpperCase() + words.slice(1);
};

/**
 * What a domain's card exposes, from the kinds the domain declares beside its handlers: a control's taps as buttons
 * and its guarded actions (one that asks first, or takes a code) through the skin's question and keypad, or none for a
 * reading. An action that takes a value a press can't give is left out, and `leftOut` says which. Refuses a kind the
 * domain can't be drawn as, with the reason.
 */
export function cardKind(domain, asked) {
  const kind = asked ?? domain.kind;
  if (kind !== "control" && kind !== "reading") throw new Error(`kind "${kind}" must be "control" or "reading"`);
  const guarded = domain.guarded ?? [];
  if (kind === "control" && !domain.actions.length && !guarded.length) throw new Error(`${domain.Name}Handlers has no action a neutral card can press: ${domain.leftOut?.length ? `${domain.leftOut.join(", ")} take${domain.leftOut.length > 1 ? "" : "s"} a value` : "it has none"}. Use --kind reading`);
  const control = kind === "control";
  return { kind, actions: control ? domain.actions : [], guarded: control ? guarded : [], leftOut: control ? domain.leftOut ?? [] : [] };
}

/** A guarded action's key, what a card's details open on: `onUnlock` → "unlock". */
export const keyOf = (action) => wordsOf(action).replace(/ /g, "-");

/**
 * The tokens one domain's card templates need, for a skin. `drawn` is `cardKind`'s answer; a bare list of actions is
 * the taps alone.
 */
export function cardTokens(domain, names, drawn) {
  const { Skin } = names;
  const { actions, guarded = [], leftOut = [] } = Array.isArray(drawn) ? { actions: drawn } : drawn;
  const history = domain.history !== false;
  const code = domain.code ? "!!e.codeFormat" : "false";
  const guardedRows = guarded.map(({ action, asks, code: takesCode }) => `    ...(${action} ? [{ key: "${keyOf(action)}", label: "${labelOf(action)}"${asks ? ", asks: true" : ""}${takesCode ? `, code: ${code}${domain.code ? ', text: e.codeFormat === "text"' : ""}` : ""}, run: ${action} }] : []),`);
  const actionRows = actions.map((action) => {
    const pressed = action === "onToggle" ? ' pressed={e.state !== "off" && e.state !== "unavailable"}' : action === "onBaseToggle" ? ' {...("baseOn" in e ? { pressed: e.baseOn === true } : {})}' : "";
    return `      {${action} && <${Skin}Action label="${labelOf(action)}"${pressed} unavailable={unavailable} onPress={${action}} />}`;
  }).join("\n");
  return {
    ...skinTokens(names),
    __Name__: domain.Name,
    __name__: domain.name,
    __CONST__: domain.CONST,
    __Label__: domain.Label,
    __label__: domain.words,
    __actionProps__: [
      ...actions.map((action) => `  ${action}?: () => void;`),
      ...guarded.map(({ action, asks, code: takesCode }) => `  /** ${asks ? "Asks first: the question, or the keypad where the entity wants a code; never one tap." : "Runs at once, and asks for the code where the entity wants one."} */\n  ${action}?: (${takesCode ? "code?: string" : ""}) => GuardedResult;`),
    ].join("\n"),
    __actionArgs__: [...actions, ...guarded.map(({ action }) => action)].map((action) => `, ${action}`).join(""),
    __actionImport__: actions.length ? `${Skin}Action, ` : "",
    __guardedTypeImport__: guarded.length ? `${Skin}GuardedAction, ` : "",
    __guardedResultImport__: guarded.length ? 'import type { GuardedResult } from "@dashhaus/core/primitives";' : "",
    __guardedBlock__: guarded.length ? `  const guarded: ${Skin}GuardedAction[] = [\n${guardedRows.join("\n")}\n  ];` : "",
    __guardedProp__: guarded.length ? " guarded={guarded}" : "",
    __leftOut__: leftOut.length ? `  // Left out: ${leftOut.join(", ")} take${leftOut.length > 1 ? "" : "s"} a value a press can't give; draw ${leftOut.length > 1 ? "them" : "it"} with this skin's own control.` : "",
    __historyType__: history ? `, ${domain.Name}History` : "",
    __historyProp__: history ? `  history?: ${domain.Name}History;` : "",
    __historyArg__: history ? ", history" : "",
    __historyNote__: history ? `      {history && <p className="${names.skin}-${domain.name}-history">Today’s history is connected and ready for a domain-specific drawing.</p>}` : "",
    __historyLive__: history ? " history={result.history}" : "",
    __historyDemo__: history ? " history={demo.history}" : "",
    __loadHistory__: domain.options.includes("loadHistory") ? " loadHistory={false}" : "",
    __unavailableConst__: actions.length ? '  const unavailable = e.state === "unavailable";' : "",
    __actionsBlock__: actions.length ? `  const actions = (
    <>
${actionRows}
    </>
  );` : "",
    __actionsProp__: actions.length ? ` actions={${actions.join(" || ")} ? actions : undefined}` : "",
    __summary__: domain.summary,
    __liveProps__: [...actions, ...guarded.map(({ action }) => action)].map((action) => ` ${action}={result.actions.${action}}`).join(""),
  };
}

/**
 * The card's two lines in `lovelace/registry.tsx`: its import, and its row, which routes its Home Assistant domains
 * (and an entity-id pattern, for a card on another card's domain) to its connected card, and reads its companions'
 * YAML keys (a sensor's `humidity: sensor.x`) into `item.companions` for the hook.
 */
export function registryLines(domain, { Skin, skinVar }) {
  const companions = domain.companions ?? [];
  const live = [
    ...domain.options.map((key) => key === "loadHistory" ? " loadHistory={item.history}" : ` ${key}={item.${key}}`),
    ...companions.map(({ key, option }) => ` ${option}={item.companions?.${key}}`),
  ].join("");
  const keys = companions.length ? `, ...${skinVar}Companions([${companions.map(({ key }) => `"${key}"`).join(", ")}])` : "";
  return {
    import: `import { Ha${Skin}${domain.Name}Card } from "../ha/Ha${Skin}${domain.Name}Card";\n`,
    entry: `  ${domain.name}: { domains: [${domain.domains.map((name) => `"${name}"`).join(", ")}]${domain.id ? `, id: ${domain.id}` : ""}${keys}, render: (item, footprint) => <Ha${Skin}${domain.Name}Card entityId={item.entity}${live} footprint={footprint} /> },`,
  };
}

/** Where `registryLines` go: before these marker comments in `lovelace/registry.tsx`. */
export const REGISTRY_MARKERS = {
  imports: "// new-card: registry imports",
  entries: "// new-card: registry entries",
};

/** Insert text before a marker comment's line; repeated insertions keep their order. Unchanged when it's missing. */
export const beforeMarker = (marker, text) => (source) => {
  const at = source.indexOf(marker);
  if (at === -1) return source;
  const line = text.endsWith("\n") ? text : `${text}\n`;
  const start = source.lastIndexOf("\n", at) + 1;
  return source.slice(0, start) + line + source.slice(start);
};

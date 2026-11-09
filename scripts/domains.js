#!/usr/bin/env node
/**
 * What a skin's card generator needs to know about one shared domain, read from @dashhaus/core's sources: its entity
 * fields, the hook's options, its actions as the domain declares them beside its handlers (`<NAME>_ACTIONS`: a tap, a
 * code or a value, and whether it asks first), whether it has today's history, and which Home Assistant domains it
 * draws.
 *
 * `new-card --skin <skin>` describes a domain live. The published scaffolder can't read the repository, so
 * `npm run domains` writes every describable domain to the scaffolder's `src/domains.json`, and
 * verify/generator-packages.test.ts fails when that file falls behind the sources.
 */
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { packageFile, root, skinTemplates } from "./packages.js";
import { exists, names, orbKinds, read } from "./new-card/lib.js";

const shape = (source, name) => source.match(new RegExp(`(?:interface|type) ${name}\\b[^{]*\\{([\\s\\S]*?)\\n?\\}`))?.[1];
const objectBody = (source, name) => source.match(new RegExp(`export const ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`))?.[1];

/**
 * A domain's declared actions (`<NAME>_ACTIONS` in its actions file), each `{ action, takes, asks }`, and `when` where
 * it asks only for some entities (`{ deviceClass: ["garage", "door", "gate"] }`). Every handler must be declared: a
 * generator never guesses what an action is from its signature.
 */
export function declaredActions(source, Name, CONST) {
  const handlers = shape(source, `${Name}Handlers`);
  if (handlers == null) return [];
  const names = [...handlers.matchAll(/^\s+(on\w+)\??:/gm)].map((match) => match[1]);
  const body = objectBody(source, `${CONST}_ACTIONS`);
  if (body == null) throw new Error(`${Name}Handlers has no ${CONST}_ACTIONS beside it saying what each action is (ActionKinds)`);
  const bound = (kind, key) => {
    const raw = kind.match(new RegExp(`\\b${key}: (-?[\\d.]+|"\\w+")`))?.[1];
    return raw == null ? undefined : raw.startsWith('"') ? { field: raw.slice(1, -1) } : Number(raw);
  };
  /** `when: { deviceClass: ["garage", "door", "gate"] }`: each field, and the values it asks for. */
  const when = (kind) => {
    const raw = kind.match(/\bwhen: \{([^}]*)\}/)?.[1];
    if (raw == null) return undefined;
    const fields = Object.fromEntries([...raw.matchAll(/(\w+): \[([^\]]*)\]/g)].map(([, field, values]) => [field, [...values.matchAll(/"([^"]+)"/g)].map(([, value]) => value)]));
    if (!Object.keys(fields).length) throw new Error(`${CONST}_ACTIONS has a \`when\` its reader can't read: ${kind.trim()}`);
    return fields;
  };
  const declared = Object.fromEntries([...body.matchAll(/^\s+(on\w+): \{(.*)\},?(?:\s*\/\/.*)?$/gm)].map(([, action, kind]) => [action, {
    takes: kind.match(/takes: "(\w+)"/)?.[1],
    asks: /asks: true/.test(kind),
    ...(/asks: true/.test(kind) && when(kind) && { when: when(kind) }),
    // A value said as what it is: the entity field it lives in, and a level's range or a choice's options.
    ...(/takes: "(level|choice|switch)"/.test(kind) && { field: kind.match(/\bfield: "(\w+)"/)?.[1] }),
    ...(/takes: "level"/.test(kind) && { min: bound(kind, "min") ?? 0, max: bound(kind, "max") ?? 100, wakes: /wakes: true/.test(kind), runs: /runs: true/.test(kind) }),
    ...(/takes: "choice"/.test(kind) && {
      options: kind.match(/\boptions: "(\w+)"/)?.[1] != null
        ? { field: kind.match(/\boptions: "(\w+)"/)[1] }
        : [...(kind.match(/\boptions: \[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map(([, option]) => option),
    }),
  }]));
  const missing = names.filter((action) => !declared[action]?.takes);
  if (missing.length) throw new Error(`${CONST}_ACTIONS doesn't say what ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"}`);
  return names.map((action) => ({ action, ...declared[action] }));
}

/** The expression a neutral card shows as its summary: the domain's headline number, or its state in words. */
function summaryFor(entity) {
  const has = (field) => new RegExp(`^\\s+${field}\\??: `, "m").test(entity);
  if (has("temperature") && has("unit")) return 'e.temperature == null ? stateWords(e.state) : `${e.temperature}${e.unit}`';
  if (has("temperature") && has("temperatureUnit")) return 'e.temperature == null ? stateWords(e.state) : `${e.temperature}${e.temperatureUnit}`';
  if (has("currentTemperature") && has("unit")) return 'e.currentTemperature == null ? stateWords(e.state) : `${e.currentTemperature}${e.unit}`';
  if (has("currentHumidity")) return 'e.currentHumidity == null ? stateWords(e.state) : `${e.currentHumidity}%`';
  if (has("heartRate")) return 'e.heartRate == null ? stateWords(e.state) : `${e.heartRate} bpm`';
  // A cover's position is a percent; a player's, beside its duration, is seconds into a track.
  if (has("position") && !has("duration")) return 'e.position == null ? stateWords(e.state) : `${e.position}%`';
  if (has("volume")) return 'e.volume == null ? stateWords(e.state) : `${e.volume}%`';
  if (has("brightness")) return 'e.brightness == null ? stateWords(e.state) : `${e.brightness}%`';
  if (has("targetHumidity")) return 'e.targetHumidity == null ? stateWords(e.state) : `${e.targetHumidity}%`';
  return "stateWords(e.state)";
}

/** One domain, described; throws, saying why, when a neutral card can't draw it. */
export function describeDomain(name) {
  const { Name, CONST, words, Label } = names(name, '"light"');
  const typesPath = packageFile("core", `src/entities/${name}/types.ts`);
  if (!exists(typesPath)) throw new Error(`${typesPath} doesn't exist. A generated skin draws a shared domain that already exists`);
  const types = read(typesPath);
  const entity = shape(types, `${Name}Entity`);
  if (!entity) throw new Error(`${typesPath} must export ${Name}Entity`);
  // Today's history is optional: a lock's day is its last change.
  const historyShape = shape(types, `${Name}History`);
  const history = historyShape != null;

  const hookPath = packageFile("core", `src/ha/hooks/${name}.ts`);
  if (!exists(hookPath)) throw new Error(`${hookPath} doesn't exist: generated skins reach Home Assistant through useHa${Name}`);
  const hook = read(hookPath);
  const options = shape(hook, `Ha${Name}Options`);
  if (!new RegExp(`export function useHa${Name}\\b`).test(hook) || options == null) throw new Error(`${hookPath} must export useHa${Name} and Ha${Name}Options`);
  const required = [...options.matchAll(/^\s+(\w+): /gm)].map((match) => match[1]);
  if (required.length) throw new Error(`useHa${Name} requires ${required.join(", ")}, which a generated Card can't know`);

  const actionsPath = packageFile("core", `src/ha/actions/${name}.ts`);
  const declared = exists(actionsPath) ? declaredActions(read(actionsPath), Name, CONST) : [];
  // A tap: a button. Asks first, or takes a code: through the skin's question and keypad, and one that asks only for
  // some entities (`when`) asks for those and runs at once for the rest. A value: left out.
  const actions = declared.filter(({ takes, asks }) => takes === "nothing" && !asks).map(({ action }) => action);
  const guarded = declared.filter(({ takes, asks }) => takes === "code" || (takes === "nothing" && asks)).map(({ action, takes, asks, when }) => ({ action, asks, code: takes === "code", ...(when && { when }) }));
  // A level, a choice or a switch: drawn on a skin's own parts where it has them (orb's and field's), else left out.
  // A level that runs on by itself (a track's position) is left out: a part that holds a level still would show where
  // it was, and set it on every move; a skin draws it on its own running clock. A level that asks first has no
  // question in any skin yet: one that asks for every entity is left out, and one that asks only for some (`when`) is
  // drawn for the rest, its `when` saying where it is left out.
  const valued = (takes) => declared.filter((kind) => kind.takes === takes && !kind.runs && !(kind.asks && !kind.when)).map(({ action, field, min, max, wakes, options, when }) => ({ action, field, ...(takes === "level" && { min, max, wakes }), ...(takes === "choice" && { options }), ...(when && { asks: true, when }) }));
  const levels = valued("level");
  const runs = declared.filter((kind) => kind.takes === "level" && kind.runs).map(({ action }) => action);
  const choices = valued("choice");
  const switches = valued("switch");
  const leftOut = declared.filter(({ takes }) => takes === "value" || takes === "level" || takes === "choice" || takes === "switch").map(({ action }) => action);

  const fixturePath = packageFile("core", `src/ha/fixtures/${name}.json`);
  if (!exists(fixturePath)) throw new Error(`${fixturePath} doesn't exist`);
  const fixture = JSON.parse(read(fixturePath));
  const fixtureId = Object.entries(fixture).find(([, value]) => !["unavailable", "unknown"].includes(value.state))?.[0];
  if (!fixtureId) throw new Error(`${fixturePath} has no available entity`);

  // The Home Assistant domains it draws, as orb's Lovelace card routes them; a domain orb has no card for yet (its card
  // being drawn now), the ones its fixture's entities are in.
  const orb = orbKinds();
  const shared = orb.shared[name];
  const routed = shared?.domains ?? Object.keys(orb.domainKind).filter((domain) => orb.domainKind[domain] === name);
  const domains = routed.length ? routed : [...new Set(Object.keys(fixture).map((id) => id.split(".")[0]))];
  if (!domains.length) throw new Error(`${orb.path} gives ${name} no Home Assistant domain, and ${fixturePath} has no entity`);

  return {
    name, Name, CONST, words, Label,
    domains,
    /** A card on another card's Home Assistant domain, picked with `card:` or its `id` pattern. */
    ...(shared && { shared: true }),
    ...(shared?.id && { id: shared.id }),
    kind: actions.length || guarded.length ? "control" : "reading",
    actions,
    guarded,
    leftOut,
    /** The left-out levels that run on by themselves (a track's position): drawn on a skin's own running clock. */
    ...(runs.length && { runs }),
    /** Each declared level: its field, its range (a number, or `{ field }` holding it), whether setting it turns it on. */
    levels,
    /** Each declared choice: its field, and its options (a fixed list, or `{ field }` holding the entity's own). */
    choices,
    /** Each declared switch: its boolean field. */
    switches,
    history,
    /** The entity says whether it wants a code (`codeFormat`, Home Assistant's `code_format`). */
    code: /^\s+codeFormat\??: /m.test(entity),
    /** The entity's fields, by name. */
    fields: [...entity.matchAll(/^\s+(\w+)\??: /gm)].map(([, field]) => field),
    /** Its state can be "on": a toggle's key latches, its LED on while it is. */
    onOff: /^\s+state: [^;]*"on"/m.test(entity),
    /** Today's history counts the minutes in a state (`onMinutes` → "on"), for its summary in words; or null. */
    minutes: historyShape?.match(/^\s+(\w+)Minutes\??: number/m)?.[1] ?? null,
    /** Today's history has hourly samples, for a meter. */
    samples: historyShape != null && /^\s+samples: /m.test(historyShape),
    summary: summaryFor(entity),
    /** The hook's options a dashboard's YAML can fill, in the order a connected card passes them. */
    options: [...["name", "area"].filter((key) => new RegExp(`^\\s+${key}\\?: `, "m").test(options)), ...(/^\s+loadHistory\?: /m.test(options) ? ["loadHistory"] : [])],
    /** The hook's companion entities (`humidityEntityId`), each with the YAML key that names it (`humidity`). */
    companions: [...options.matchAll(/^\s+(\w+)EntityId\?: string;/gm)].map(([, key]) => ({ key: key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), option: `${key}EntityId` })),
    fixtureId,
  };
}

/**
 * Every shared domain a neutral card can draw, by name. One whose hook needs an option a card can't know is left out;
 * any other error stops the run, so a slip in core can't quietly drop a card from the scaffolder.
 */
export function describeDomains() {
  const entities = packageFile("core", "src/entities");
  const folders = readdirSync(join(root, entities), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  return Object.fromEntries(folders.flatMap((name) => {
    try {
      return [[name, describeDomain(name)]];
    } catch (error) {
      if (/a generated Card can't know/.test(error.message)) return [];
      throw error;
    }
  }));
}

/** The scaffolder's copy: what its `add` command can draw. */
export const domainsFile = `${skinTemplates.package}/src/domains.json`;
export const domainsJson = () => `${JSON.stringify(describeDomains(), null, 2)}\n`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  writeFileSync(join(root, domainsFile), domainsJson());
  console.log(`Wrote ${domainsFile}: ${Object.keys(describeDomains()).join(", ")}`);
}

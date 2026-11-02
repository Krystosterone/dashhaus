#!/usr/bin/env node
/**
 * What a skin's card generator needs to know about one shared domain, read from @dashhaus/core's sources: its entity
 * fields, the hook's options, the actions a neutral card can expose, and which Home Assistant domains it draws.
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

/** The expression a neutral card shows as its summary: the domain's headline number, or its state in words. */
function summaryFor(entity) {
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
}

/** One domain, described; throws, saying why, when a neutral card can't draw it. */
export function describeDomain(name) {
  const { Name, CONST, words, Label } = names(name, '"light"');
  const typesPath = packageFile("core", `src/entities/${name}/types.ts`);
  if (!exists(typesPath)) throw new Error(`${typesPath} doesn't exist. A generated skin draws a shared domain that already exists`);
  const types = read(typesPath);
  const entity = shape(types, `${Name}Entity`);
  if (!entity || !shape(types, `${Name}History`)) throw new Error(`${typesPath} must export ${Name}Entity and ${Name}History`);

  const hookPath = packageFile("core", `src/ha/hooks/${name}.ts`);
  if (!exists(hookPath)) throw new Error(`${hookPath} doesn't exist: generated skins reach Home Assistant through useHa${Name}`);
  const hook = read(hookPath);
  const options = shape(hook, `Ha${Name}Options`);
  if (!new RegExp(`export function useHa${Name}\\b`).test(hook) || options == null) throw new Error(`${hookPath} must export useHa${Name} and Ha${Name}Options`);
  const required = [...options.matchAll(/^\s+(\w+): /gm)].map((match) => match[1]);
  if (required.length) throw new Error(`useHa${Name} requires ${required.join(", ")}, which a generated Card can't know`);

  const actionsPath = packageFile("core", `src/ha/actions/${name}.ts`);
  const handlers = exists(actionsPath) ? shape(read(actionsPath), `${Name}Handlers`) ?? "" : "";
  const actions = [...handlers.matchAll(/^\s+(on\w+)\??:\s*\(\)\s*=>/gm)].map((match) => match[1]);

  const fixturePath = packageFile("core", `src/ha/fixtures/${name}.json`);
  if (!exists(fixturePath)) throw new Error(`${fixturePath} doesn't exist`);
  const fixtureId = Object.entries(JSON.parse(read(fixturePath))).find(([, value]) => !["unavailable", "unknown"].includes(value.state))?.[0];
  if (!fixtureId) throw new Error(`${fixturePath} has no available entity`);

  const orb = orbKinds();
  const shared = orb.shared[name];
  const domains = shared?.domains ?? Object.keys(orb.domainKind).filter((domain) => orb.domainKind[domain] === name);
  if (!domains.length) throw new Error(`${orb.path} gives ${name} no Home Assistant domain`);

  return {
    name, Name, CONST, words, Label,
    domains,
    ...(shared?.id && { id: shared.id }),
    kind: actions.length ? "control" : "reading",
    actions,
    summary: summaryFor(entity),
    /** The hook's options a dashboard's YAML can fill, in the order a connected card passes them. */
    options: [...["name", "area"].filter((key) => new RegExp(`^\\s+${key}\\?: `, "m").test(options)), ...(/^\s+loadHistory\?: /m.test(options) ? ["loadHistory"] : [])],
    /** The hook's companion entities (`humidityEntityId`), each with the YAML key that names it (`humidity`). */
    companions: [...options.matchAll(/^\s+(\w+)EntityId\?: string;/gm)].map(([, key]) => ({ key: key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), option: `${key}EntityId` })),
    fixtureId,
  };
}

/** Every shared domain a neutral card can draw, by name; the ones it can't are left out. */
export function describeDomains() {
  const entities = packageFile("core", "src/entities");
  const folders = readdirSync(join(root, entities), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  return Object.fromEntries(folders.flatMap((name) => {
    try {
      return [[name, describeDomain(name)]];
    } catch {
      return [];
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

import type { NavEntry } from "./nav";

/*
 * Reading a Lovelace card's YAML, for every skin's Lovelace card: the reader every card extends, the table that
 * turns an entity id into the card kind that draws it, the per-kind escape hatch that reads a kind's own options,
 * and the renderer dispatch that turns a normalized card back into a skin's element. Pure: no React, no DOM, no
 * skin, and no runtime relative import, so a Node config (dashboard.config.mjs, a generated skin) can import it.
 */

/** The card's own first page, before any of its `pages`; `page: home` returns to it. */
export const MAIN_PAGE = "home";

export class DashboardConfigError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Dashhaus config has ${problems.length === 1 ? "a problem" : `${problems.length} problems`}:\n${problems.map((p) => `• ${p}`).join("\n")}`);
    this.name = "DashboardConfigError";
    this.problems = problems;
  }
}

export type Raw = Record<string, unknown>;
export const isRaw = (value: unknown): value is Raw => typeof value === "object" && value !== null && !Array.isArray(value);
const ENTITY_ID = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const NAV_KINDS = ["section", "page", "navigate"] as const;
const PAGE_ID = /^[a-z0-9][a-z0-9_-]*$/;

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = row[j];
      row[j] = next;
    }
  }
  return row[b.length];
}

/** The closest allowed word, if the typo is small enough to be one. */
export function suggest(word: string, allowed: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of allowed) {
    const d = distance(word.toLowerCase(), candidate);
    if (d < bestDistance) { best = candidate; bestDistance = d; }
  }
  return bestDistance <= Math.max(2, Math.floor(word.length / 3)) ? best : undefined;
}

export const oneOf = (allowed: readonly string[]) => allowed.map((a) => `"${a}"`).join(", ");

/** Checks values, collecting every problem. A skin's Lovelace card extends it with its own sections and cards. */
export class Reader {
  readonly problems: string[] = [];

  problem(path: string, message: string) { this.problems.push(path ? `${path}: ${message}` : message); }

  keys(raw: Raw, path: string, allowed: readonly string[]) {
    for (const key of Object.keys(raw)) {
      if (allowed.includes(key)) continue;
      const near = suggest(key, allowed);
      this.problem(path, `unknown key "${key}"${near ? ` — did you mean "${near}"?` : ""}`);
    }
  }

  string(raw: Raw, key: string, path: string): string | undefined {
    const value = raw[key];
    if (value == null) return undefined;
    if (typeof value === "string" || typeof value === "number") return String(value);
    this.problem(path, `"${key}" must be text`);
  }

  boolean(raw: Raw, key: string, path: string): boolean | undefined {
    const value = raw[key];
    if (value == null) return undefined;
    if (typeof value === "boolean") return value;
    this.problem(path, `"${key}" must be true or false`);
  }

  number(raw: Raw, key: string, path: string, min: number, max: number, integer = true): number | undefined {
    const value = raw[key];
    if (value == null) return undefined;
    if (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value))) return value;
    this.problem(path, `"${key}" must be ${integer ? "a whole number" : "a number"} from ${min} to ${max}`);
  }

  choice<T extends string>(raw: Raw, key: string, path: string, allowed: readonly T[]): T | undefined {
    const value = raw[key];
    if (value == null) return undefined;
    if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
    const near = typeof value === "string" ? suggest(value, allowed) : undefined;
    this.problem(path, `"${key}" must be one of ${oneOf(allowed)}${near ? ` — did you mean "${near}"?` : ""}`);
  }

  entityId(value: unknown, path: string, domains?: readonly string[]): string | undefined {
    if (typeof value !== "string" || !ENTITY_ID.test(value)) {
      this.problem(path, `"${String(value)}" is not an entity id like light.kitchen`);
      return undefined;
    }
    const domain = value.slice(0, value.indexOf("."));
    if (domains && !domains.includes(domain)) {
      this.problem(path, `${value} must be a ${domains.map((d) => `${d}.*`).join(" or ")} entity`);
      return undefined;
    }
    return value;
  }

  optionalEntity(raw: Raw, key: string, path: string, domains: readonly string[]): string | undefined {
    if (raw[key] == null) return undefined;
    return this.entityId(raw[key], `${path}.${key}`, domains);
  }

  /** One nav destination: exactly one of `section`, `page` or `navigate`, and an optional `label`. */
  navEntry(value: unknown, path: string): NavEntry | undefined {
    if (!isRaw(value)) {
      this.problem(path, "a nav item is a map with one of \"section\", \"page\" or \"navigate\"");
      return undefined;
    }
    this.keys(value, path, [...NAV_KINDS, "label"]);
    const kinds = NAV_KINDS.filter((k) => value[k] != null);
    if (kinds.length !== 1) {
      this.problem(path, `needs exactly one of ${oneOf(NAV_KINDS)}`);
      return undefined;
    }
    const label = this.string(value, "label", path);
    const target = this.string(value, kinds[0], path);
    if (target == null) return undefined;
    if (kinds[0] === "section") return { kind: "section", title: target, label };
    if (kinds[0] === "page") return { kind: "page", id: target, label };
    if (!target.startsWith("/")) {
      this.problem(path, `"navigate" is a Home Assistant path like /baby-view/0`);
      return undefined;
    }
    return { kind: "navigate", path: target, label };
  }

  /**
   * The card's `nav` (spec/deploy.md → Navigation): a list of destinations, `false` for none, or left out. A page must
   * be one of `pages` or the main page; a section, one of `titles`, the main page's titled sections, when the YAML
   * lays them out (an automatic layout's can't be named ahead), and the only one of its title.
   */
  nav(raw: Raw, pages: readonly { id: string }[], titles?: readonly string[]): NavEntry[] | false | undefined {
    if (raw.nav === false) return false;
    if (raw.nav == null) return undefined;
    if (!Array.isArray(raw.nav)) {
      this.problem("nav", "must be a list of destinations, or false for no nav");
      return undefined;
    }
    const nav = raw.nav.map((n, i) => this.navEntry(n, `nav[${i}]`)).filter((n): n is NavEntry => !!n);
    const pageIds = [MAIN_PAGE, ...pages.map((p) => p.id)];
    nav.forEach((n, i) => {
      if (n.kind === "page" && !pageIds.includes(n.id)) {
        const near = suggest(n.id, pageIds);
        this.problem(`nav[${i}]`, `no page "${n.id}"${near ? ` — did you mean "${near}"?` : ` (pages: ${oneOf(pageIds)})`}`);
      }
      if (n.kind === "section" && titles && !titles.includes(n.title)) {
        const near = titles.find((t) => t.toLowerCase() === n.title.toLowerCase()) ?? suggest(n.title, titles);
        this.problem(`nav[${i}]`, `no section titled "${n.title}" in the top-level sections${near ? ` — did you mean "${near}"?` : ""}`);
      }
      if (n.kind === "section" && titles && titles.filter((t) => t === n.title).length > 1) {
        this.problem(`nav[${i}]`, `${titles.filter((t) => t === n.title).length} sections are titled "${n.title}"; give each its own title so the nav can tell them apart`);
      }
    });
    return nav;
  }

  /** One of the card's `pages`: its id, its title and its `sections`, each read by the skin's `block`. */
  page<B>(value: unknown, path: string, block: (value: unknown, path: string) => B | undefined): { id: string; title: string; blocks: B[] } | undefined {
    if (!isRaw(value)) {
      this.problem(path, "a page is a map with \"id\", \"title\" and \"sections\"");
      return undefined;
    }
    this.keys(value, path, ["id", "title", "sections"]);
    const id = this.string(value, "id", path);
    const title = this.string(value, "title", path);
    if (id == null || !PAGE_ID.test(id)) this.problem(path, "\"id\" is required: lower-case letters, digits, - and _, like living-room");
    else if (id === MAIN_PAGE) this.problem(path, `"id" can't be "${MAIN_PAGE}": that is the top-level sections`);
    if (title == null) this.problem(path, "\"title\" is required");
    if (!Array.isArray(value.sections) || value.sections.length === 0) {
      this.problem(path, "\"sections\" must be a list of at least one section");
      return undefined;
    }
    const blocks = value.sections.map((s, i) => block(s, `${path}.sections[${i}]`)).filter((b): b is B => !!b);
    return id && title && PAGE_ID.test(id) && id !== MAIN_PAGE ? { id, title, blocks } : undefined;
  }

  /** The card's `pages`, more pages opened by its nav, each id its own; left out, none. */
  pages<B>(raw: Raw, block: (value: unknown, path: string) => B | undefined): { id: string; title: string; blocks: B[] }[] | undefined {
    if (raw.pages == null) return undefined;
    if (!Array.isArray(raw.pages) || raw.pages.length === 0) {
      this.problem("pages", "must be a list of at least one page, or left out");
      return undefined;
    }
    const pages = raw.pages.map((p, i) => this.page(p, `pages[${i}]`, block)).filter((p): p is { id: string; title: string; blocks: B[] } => !!p);
    const ids = pages.map((p) => p.id);
    for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) this.problem("pages", `two pages have the id "${id}"`);
    return pages;
  }
}

/** A card as a schema reads it: the entity, and the kind that draws it. */
export interface CardShape<K extends string = string> {
  entity: string;
  kind: K;
}

/** One card kind: its Home Assistant domains, the id pattern that picks it on a shared domain, and its own keys. */
export interface CardKindSpec {
  readonly domains: readonly string[];
  readonly id?: RegExp;
  /** YAML keys this kind takes besides the card's common ones. */
  readonly keys?: readonly string[];
  /** Read this kind's own settings: the escape hatch for options only one card has. */
  readonly options?: (read: Reader, raw: Raw, at: string) => Record<string, unknown>;
}

/** How a card schema resolves an entity id to a kind. */
export interface CardKindTable<K extends string> {
  readonly kinds: readonly K[];
  readonly domains: readonly string[];
  kindsFor(entity: string): K[];
  kindOf(entity: string): K | undefined;
}

const domainOf = (entity: string) => entity.slice(0, entity.indexOf("."));

/**
 * Resolve entity ids against a kind table: a kind whose `id` matches first, else the first kind without one (a
 * domain's own card before a card that shares its domain).
 */
export function cardKinds<K extends string>(table: Readonly<Record<K, { domains: readonly string[]; id?: RegExp }>>): CardKindTable<K> {
  const kinds = Object.keys(table) as K[];
  const kindsFor = (entity: string) => kinds.filter((kind) => table[kind].domains.includes(domainOf(entity)));
  return {
    kinds,
    domains: [...new Set(kinds.flatMap((kind) => table[kind].domains))],
    kindsFor,
    kindOf(entity: string) {
      const available = kindsFor(entity);
      return available.find((kind) => table[kind].id?.test(entity)) ?? available.find((kind) => !table[kind].id);
    },
  };
}

/**
 * A skin whose kinds live in two tables (a domain's own card, then the cards that share a domain), in the order an
 * entity id tries them: every domain's own card, then the shared ones.
 */
export function cardKindOrder<K extends string>(domainKind: Readonly<Record<string, K>>, shared: Readonly<Partial<Record<K, unknown>>>): K[] {
  return [...new Set([...Object.values(domainKind), ...(Object.keys(shared) as K[])])];
}

/** One skin's card reader: what a card is called, its common keys, its kind table and its per-kind options. */
export interface CardReadSchema<K extends string, C extends CardShape<K>> {
  /** What a card is called in messages: "card", "module". */
  readonly noun: string;
  /** YAML keys every card of this skin takes. */
  readonly common: readonly string[];
  /** Domains an entity id may belong to; absent: any. */
  readonly domains?: readonly string[];
  /** How an entity id picks its kind; defaults to the kind record's order. */
  readonly order?: readonly K[];
  readonly kinds: Readonly<Record<K, CardKindSpec>>;
  /** Stop at an invalid `card:` instead of reading the domain's default kind (orb), or both (field). */
  readonly stopOnInvalidCard?: boolean;
  /** The settings every kind shares. The entity and kind are filled in by `readCard`. */
  base(read: Reader, raw: Raw, at: string): Omit<C, "kind" | "entity">;
  /** A domain with no kind: the message after the path. */
  noKind?(entity: string, domain: string): string;
  /** A card with no entity: the whole message. */
  missing?(raw: Raw): string;
  /** Reject a value before it is read (a module that is a bundle); false stops. */
  before?(read: Reader, raw: Raw, path: string): boolean;
  /** Unknown keys, for a skin with reasons of its own for some keys. */
  checkKeys?(read: Reader, raw: Raw, at: string, allowed: readonly string[]): void;
}

/**
 * Read one card: its shape, entity id, kind, known keys, base settings and the kind's options. Every problem is
 * collected on `read`, with its path.
 */
export function readCard<K extends string, C extends CardShape<K>>(
  read: Reader,
  schema: CardReadSchema<K, C>,
  value: unknown,
  path: string,
): C | undefined {
  if (isRaw(value) && schema.before && !schema.before(read, value, path)) return undefined;
  if (!isRaw(value) && typeof value !== "string") {
    read.problem(path, `a ${schema.noun} is an entity id, or a map with an "entity" key`);
    return undefined;
  }
  const raw: Raw = typeof value === "string" ? { entity: value } : value;
  if (raw.entity == null) {
    read.problem(path, schema.missing?.(raw) ?? `a ${schema.noun} needs an "entity"`);
    return undefined;
  }
  const entity = read.entityId(raw.entity, path, schema.domains);
  if (!entity) return undefined;
  const domain = domainOf(entity);
  const order = schema.order ?? (Object.keys(schema.kinds) as K[]);
  const available = order.filter((kind) => schema.kinds[kind].domains.includes(domain));
  if (!available.length) {
    read.problem(path, schema.noKind?.(entity, domain) ?? `${entity}: ${domain}.* entities have no ${schema.noun}`);
    return undefined;
  }
  const at = `${path} (${entity})`;
  let selected: K | undefined;
  if (raw.card != null) {
    selected = read.choice(raw, "card", at, available);
    if (selected === undefined && schema.stopOnInvalidCard) return undefined;
  }
  const kind = selected ?? (
    available.find((candidate) => schema.kinds[candidate].id?.test(entity)) ??
    available.find((candidate) => !schema.kinds[candidate].id)
  );
  if (!kind) {
    read.problem(at, `pick its ${schema.noun} with "card": one of ${available.join(", ")}`);
    return undefined;
  }
  const allowed = [...schema.common, ...(schema.kinds[kind].keys ?? [])];
  if (schema.checkKeys) schema.checkKeys(read, raw, at, allowed);
  else read.keys(raw, at, allowed);
  const base = schema.base(read, raw, at);
  const options = schema.kinds[kind].options?.(read, raw, at) ?? {};
  return { ...base, entity, kind, ...options } as C;
}

/** Read a non-empty list of cards, each with its path. */
export function readCards<K extends string, C extends CardShape<K>>(
  read: Reader,
  schema: CardReadSchema<K, C>,
  value: unknown,
  path: string,
  noun = schema.noun,
): C[] {
  if (!Array.isArray(value) || value.length === 0) {
    read.problem(path, `must be a list of at least one ${noun}`);
    return [];
  }
  return value.map((card, i) => readCard(read, schema, card, `${path}[${i}]`)).filter((card): card is C => !!card);
}

/** A union member for one kind, or the whole shape when the card is not a discriminated union (field's module). */
export type CardOf<K extends string, C extends CardShape<K>, P extends K> = [Extract<C, { kind: P }>] extends [never] ? C : Extract<C, { kind: P }>;

/** How a skin draws each kind: one renderer per kind. */
export type CardRenderers<K extends string, C extends CardShape<K>, R, A extends unknown[] = []> = {
  [P in K]: (card: CardOf<K, C, P>, ...args: A) => R;
};

/** Draw a normalized card with its kind's renderer. */
export function renderCard<K extends string, C extends CardShape<K>, R, A extends unknown[]>(
  renderers: CardRenderers<K, C, R, A>,
  card: C,
  ...args: A
): R {
  return (renderers[card.kind] as (card: C, ...args: A) => R)(card, ...args);
}

/*
 * The option readers every skin shares. Each is the per-kind escape hatch: a skin's kind table calls the ones its
 * card takes, in the order its YAML reads them, so error order and defaults stay exactly its own.
 */

/** A card's colour, from the skin's colour names plus `none`. */
export function readColor<T extends string>(read: Reader, raw: Raw, at: string, colors: readonly T[]): T | "none" | undefined {
  return read.choice(raw, "color", at, [...colors, "none"] as const);
}

/** A temperature card's display unit. */
export const readUnit = (read: Reader, raw: Raw, at: string) => read.choice(raw, "unit", at, ["°C", "°F"] as const);

/** A sensor's companions on the same device, and whether it is outside. */
export const readSensorOptions = (read: Reader, raw: Raw, at: string) => ({
  humidity: read.optionalEntity(raw, "humidity", at, ["sensor"]),
  battery: read.optionalEntity(raw, "battery", at, ["sensor"]),
  outdoor: read.boolean(raw, "outdoor", at),
});

/** A weather card's air-quality sensor, scale, sun entity (default `sun.sun`) and forecast reading. */
export const readWeatherOptions = (read: Reader, raw: Raw, at: string) => ({
  aqi: read.optionalEntity(raw, "aqi", at, ["sensor"]),
  aqiScale: read.choice(raw, "aqi_scale", at, ["US"] as const),
  sun: raw.sun === undefined ? "sun.sun" : read.optionalEntity(raw, "sun", at, ["sun"]),
  forecasts: read.boolean(raw, "forecasts", at) ?? true,
});

/** An alarm's view-only flag, its delays and the names of the doors and windows open. */
export const readAlarmOptions = (read: Reader, raw: Raw, at: string) => {
  const sensors = raw.open_sensors;
  if (sensors != null && !(Array.isArray(sensors) && sensors.every((s) => typeof s === "string"))) read.problem(at, "\"open_sensors\" must be a list of names");
  return {
    readOnly: read.boolean(raw, "read_only", at),
    exitDelay: read.number(raw, "exit_delay", at, 0, 3600),
    entryDelay: read.number(raw, "entry_delay", at, 0, 3600),
    openSensors: Array.isArray(sensors) ? sensors.filter((s): s is string => typeof s === "string") : undefined,
  };
};

/** An Owlet sock's companions, its alert sensors by alert name, and the minutes before it warns. */
export function readOwletOptions<A extends string>(read: Reader, raw: Raw, at: string, alerts: readonly A[]) {
  const rawAlerts = raw.alerts;
  if (rawAlerts != null && !isRaw(rawAlerts)) read.problem(at, "\"alerts\" must map alerts to binary_sensor.* entities, like low_oxygen: binary_sensor.sock_low_oxygen");
  if (isRaw(rawAlerts)) read.keys(rawAlerts, `${at}.alerts`, alerts);
  const heartRate = read.optionalEntity(raw, "heart_rate", at, ["sensor"]);
  const oxygen = read.optionalEntity(raw, "oxygen", at, ["sensor"]);
  const charging = read.optionalEntity(raw, "charging", at, ["binary_sensor"]);
  const baseStation = read.optionalEntity(raw, "base_station", at, ["switch"]);
  const mapped = isRaw(rawAlerts)
    ? Object.fromEntries(alerts.flatMap((alert) => {
      const id = read.optionalEntity(rawAlerts, alert, `${at}.alerts`, ["binary_sensor"]);
      return id ? [[alert, id]] : [];
    })) as Partial<Record<A, string>>
    : undefined;
  const staleAfter = read.number(raw, "stale_after", at, 1, 60);
  return {
    heartRate,
    oxygen,
    charging,
    baseStation,
    alerts: mapped,
    staleAfter,
  };
}

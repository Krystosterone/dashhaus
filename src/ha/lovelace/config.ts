import { COLORS } from "../../shared/ui";
import type { ColorName, WidgetFootprint } from "../../shared/ui";
import type { ToggleIcon } from "../../widgets/toggle/types";
import type { AlarmTileProps } from "../../widgets/alarm/AlarmTile";
import type { OwletAlert } from "../../widgets/owlet/types";
import { OWLET_ALERT_SUFFIX } from "../mappers/owlet";

/*
 * The card's YAML, as Lovelace hands it over (already parsed), checked and normalized. Every mistake is
 * collected with its path and, for a misspelt key, the key that was probably meant, so the YAML editor shows
 * all of them at once instead of the first.
 */

export type Kind = "light" | "climate" | "sensor" | "weather" | "cover" | "toggle" | "alarm" | "owlet" | "humidifier";

/** Each supported domain's widget: the entity id picks it. */
export const DOMAIN_KIND: Record<string, Kind> = {
  light: "light",
  climate: "climate",
  sensor: "sensor",
  weather: "weather",
  cover: "cover",
  input_boolean: "toggle",
  switch: "toggle",
  alarm_control_panel: "alarm",
  humidifier: "humidifier",
};

/**
 * Widgets that share a domain with that domain's own widget. A card picks one with `widget:`; an entity id
 * matching `id` picks it without.
 */
export const SHARED_KINDS: Partial<Record<Kind, { domains: string[]; id?: RegExp }>> = {
  owlet: { domains: ["sensor"], id: /^sensor\.\w+_sleep_state$/ },
};

interface CardBase {
  entity: string;
  name?: string;
  area?: string;
  footprint?: WidgetFootprint;
  span: number;
  showControl?: boolean;
  /** False skips the Today history read. */
  history: boolean;
}

export type CardConfig = CardBase & (
  | { kind: "light"; color?: ColorName | "none" }
  | { kind: "climate"; unit?: "°C" | "°F"; color?: ColorName | "none" }
  | { kind: "sensor"; humidity?: string; battery?: string; outdoor?: boolean; unit?: "°C" | "°F"; color?: ColorName | "none" }
  | { kind: "weather"; aqi?: string; aqiScale?: "US"; sun?: string; forecasts: boolean }
  | { kind: "cover"; color?: ColorName | "none" }
  | { kind: "toggle"; domain: "input_boolean" | "switch"; icon?: ToggleIcon; color?: ColorName; description?: string }
  | { kind: "alarm"; readOnly?: AlarmTileProps["readOnly"]; exitDelay?: number; entryDelay?: number; openSensors?: string[] }
  | { kind: "owlet"; heartRate?: string; oxygen?: string; charging?: string; alerts?: Partial<Record<OwletAlert, string>>; staleAfter?: number; color?: ColorName | "none" }
  | { kind: "humidifier"; color?: ColorName | "none" }
);

export type ItemConfig =
  | CardConfig
  | { kind: "joined"; label?: string; span: number; members: CardConfig[] }
  | { kind: "lead"; label?: string; sheetTitle?: string; span: number; lead: CardConfig; rows: CardConfig[] };

export interface SectionConfig { kind: "section"; title?: string; note?: string; columns: number; gap?: number; items: ItemConfig[] }
export interface ColumnsConfig { kind: "columns"; columns: number; gap?: number; sections: SectionConfig[] }
export type BlockConfig = SectionConfig | ColumnsConfig;

export type ThemeSetting = "home-assistant" | "auto" | "light" | "dark";
export interface Accent { chroma: number; hue: number }

export interface DashboardConfig {
  title: string;
  subtitle?: string;
  showTime: boolean;
  hourCycle?: "h12" | "h23";
  theme: ThemeSetting;
  accent?: Accent;
  /** Absent: lay the house out automatically. */
  blocks?: BlockConfig[];
}

/** The accents tried in Storybook's toolbar; `yellow` is tokens.css's own. */
export const ACCENTS: Record<string, Accent> = {
  yellow: { chroma: 0.145, hue: 92 },
  sage: { chroma: 0.08, hue: 150 },
  coral: { chroma: 0.12, hue: 35 },
  sky: { chroma: 0.09, hue: 235 },
  lilac: { chroma: 0.08, hue: 300 },
};

const OWLET_ALERTS = Object.keys(OWLET_ALERT_SUFFIX) as OwletAlert[];
const TOGGLE_ICONS: readonly ToggleIcon[] = ["bell-off", "moon", "volume-off", "guest", "away", "power", "waves"];
const FOOTPRINTS: readonly WidgetFootprint[] = ["compact", "standard", "featured"];
const COLOR_NAMES = Object.keys(COLORS) as ColorName[];

const COMMON_KEYS = ["entity", "widget", "name", "area", "footprint", "span", "show_control", "history"];
const KIND_KEYS: Record<Kind, string[]> = {
  light: ["color"],
  climate: ["unit", "color"],
  sensor: ["humidity", "battery", "outdoor", "unit", "color"],
  weather: ["aqi", "aqi_scale", "sun", "forecasts"],
  cover: ["color"],
  toggle: ["icon", "color", "description"],
  alarm: ["read_only", "exit_delay", "entry_delay", "open_sensors"],
  owlet: ["heart_rate", "oxygen", "charging", "alerts", "stale_after", "color"],
  humidifier: ["color"],
};
const TOP_KEYS = ["type", "title", "subtitle", "show_time", "hour_cycle", "theme", "accent", "sections", "view_layout", "grid_options", "visibility"];
const SECTION_KEYS = ["title", "note", "columns", "gap", "cards"];
const GROUP_KEYS = ["columns", "gap", "sections"];

export class DashboardConfigError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Home Dashboard config has ${problems.length === 1 ? "a problem" : `${problems.length} problems`}:\n${problems.map((p) => `• ${p}`).join("\n")}`);
    this.name = "DashboardConfigError";
    this.problems = problems;
  }
}

type Raw = Record<string, unknown>;
const isRaw = (value: unknown): value is Raw => typeof value === "object" && value !== null && !Array.isArray(value);
const ENTITY_ID = /^[a-z0-9_]+\.[a-z0-9_]+$/;

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

const oneOf = (allowed: readonly string[]) => allowed.map((a) => `"${a}"`).join(", ");

class Reader {
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

  /** The widget for an entity: `widget:` when given, else a shared widget its id names, else its domain's. */
  kind(raw: Raw, entity: string, path: string): Kind | undefined {
    const domain = entity.slice(0, entity.indexOf("."));
    const shared = (Object.keys(SHARED_KINDS) as Kind[]).filter((k) => SHARED_KINDS[k]?.domains.includes(domain));
    const kinds = [...(DOMAIN_KIND[domain] ? [DOMAIN_KIND[domain]] : []), ...shared];
    if (!kinds.length) {
      this.problem(path, `${entity}: ${domain}.* entities have no widget yet (supported: ${Object.keys(DOMAIN_KIND).join(", ")})`);
      return undefined;
    }
    if (raw.widget != null) return this.choice(raw, "widget", `${path} (${entity})`, kinds);
    const kind = shared.find((k) => SHARED_KINDS[k]?.id?.test(entity)) ?? DOMAIN_KIND[domain];
    if (!kind) this.problem(path, `${entity}: pick its widget with "widget": one of ${oneOf(kinds)}`);
    return kind;
  }

  optionalEntity(raw: Raw, key: string, path: string, domains: readonly string[]): string | undefined {
    if (raw[key] == null) return undefined;
    return this.entityId(raw[key], `${path}.${key}`, domains);
  }

  card(value: unknown, path: string): CardConfig | undefined {
    const raw: Raw = typeof value === "string" ? { entity: value } : isRaw(value) ? value : {};
    if (!isRaw(value) && typeof value !== "string") {
      this.problem(path, "a card is an entity id, or a map with an \"entity\" key");
      return undefined;
    }
    if (raw.entity == null) {
      this.problem(path, `a card needs an "entity"${raw.joined || raw.lead ? " (bundles use \"joined\" or \"lead\" at the section's card level)" : ""}`);
      return undefined;
    }
    const entity = this.entityId(raw.entity, path);
    if (!entity) return undefined;
    const domain = entity.slice(0, entity.indexOf("."));
    const kind = this.kind(raw, entity, path);
    if (!kind) return undefined;
    const at = `${path} (${entity})`;
    this.keys(raw, at, [...COMMON_KEYS, ...KIND_KEYS[kind]]);
    const base: CardBase = {
      entity,
      name: this.string(raw, "name", at),
      area: this.string(raw, "area", at),
      footprint: this.choice(raw, "footprint", at, FOOTPRINTS),
      span: this.number(raw, "span", at, 1, 12) ?? 1,
      showControl: this.boolean(raw, "show_control", at),
      history: this.boolean(raw, "history", at) ?? true,
    };
    const color = () => this.choice(raw, "color", at, [...COLOR_NAMES, "none"] as const);
    const unit = () => this.choice(raw, "unit", at, ["°C", "°F"] as const);
    switch (kind) {
      case "light": return { ...base, kind, color: color() };
      case "cover": return { ...base, kind, color: color() };
      case "climate": return { ...base, kind, unit: unit(), color: color() };
      case "sensor": return {
        ...base,
        kind,
        humidity: this.optionalEntity(raw, "humidity", at, ["sensor"]),
        battery: this.optionalEntity(raw, "battery", at, ["sensor"]),
        outdoor: this.boolean(raw, "outdoor", at),
        unit: unit(),
        color: color(),
      };
      case "weather": return {
        ...base,
        kind,
        aqi: this.optionalEntity(raw, "aqi", at, ["sensor"]),
        aqiScale: this.choice(raw, "aqi_scale", at, ["US"] as const),
        sun: raw.sun === undefined ? "sun.sun" : this.optionalEntity(raw, "sun", at, ["sun"]),
        forecasts: this.boolean(raw, "forecasts", at) ?? true,
      };
      case "toggle": return {
        ...base,
        kind,
        domain: domain as "input_boolean" | "switch",
        icon: this.choice(raw, "icon", at, TOGGLE_ICONS),
        color: this.choice(raw, "color", at, COLOR_NAMES),
        description: this.string(raw, "description", at),
      };
      case "alarm": {
        const sensors = raw.open_sensors;
        if (sensors != null && !(Array.isArray(sensors) && sensors.every((s) => typeof s === "string"))) this.problem(at, "\"open_sensors\" must be a list of names");
        return {
          ...base,
          kind,
          readOnly: this.boolean(raw, "read_only", at),
          exitDelay: this.number(raw, "exit_delay", at, 0, 3600),
          entryDelay: this.number(raw, "entry_delay", at, 0, 3600),
          openSensors: Array.isArray(sensors) ? sensors.filter((s): s is string => typeof s === "string") : undefined,
        };
      }
      case "owlet": {
        const alerts = raw.alerts;
        if (alerts != null && !isRaw(alerts)) this.problem(at, "\"alerts\" must map alerts to binary_sensor.* entities, like low_oxygen: binary_sensor.sock_low_oxygen");
        if (isRaw(alerts)) this.keys(alerts, `${at}.alerts`, OWLET_ALERTS);
        return {
          ...base,
          kind,
          heartRate: this.optionalEntity(raw, "heart_rate", at, ["sensor"]),
          oxygen: this.optionalEntity(raw, "oxygen", at, ["sensor"]),
          charging: this.optionalEntity(raw, "charging", at, ["binary_sensor"]),
          alerts: isRaw(alerts)
            ? Object.fromEntries(OWLET_ALERTS.flatMap((alert) => {
              const id = this.optionalEntity(alerts, alert, `${at}.alerts`, ["binary_sensor"]);
              return id ? [[alert, id]] : [];
            }))
            : undefined,
          staleAfter: this.number(raw, "stale_after", at, 1, 60),
          color: color(),
        };
      }
      case "humidifier": return { ...base, kind, color: color() };
    }
  }

  cards(value: unknown, path: string): CardConfig[] {
    if (!Array.isArray(value) || value.length === 0) {
      this.problem(path, "must be a list of at least one card");
      return [];
    }
    return value.map((card, i) => this.card(card, `${path}[${i}]`)).filter((c): c is CardConfig => !!c);
  }

  item(value: unknown, path: string): ItemConfig | undefined {
    if (isRaw(value) && "joined" in value) {
      this.keys(value, path, ["joined", "label", "span"]);
      return { kind: "joined", label: this.string(value, "label", path), span: this.number(value, "span", path, 1, 12) ?? 1, members: this.cards(value.joined, `${path}.joined`) };
    }
    if (isRaw(value) && "lead" in value) {
      this.keys(value, path, ["lead", "rows", "label", "sheet_title", "span"]);
      const lead = this.card(value.lead, `${path}.lead`);
      const rows = this.cards(value.rows, `${path}.rows`);
      if (!lead) return undefined;
      return { kind: "lead", label: this.string(value, "label", path), sheetTitle: this.string(value, "sheet_title", path), span: this.number(value, "span", path, 1, 12) ?? 1, lead, rows };
    }
    return this.card(value, path);
  }

  section(value: unknown, path: string): SectionConfig | undefined {
    if (!isRaw(value)) {
      this.problem(path, "a section is a map with \"cards\" (and usually a \"title\")");
      return undefined;
    }
    this.keys(value, path, SECTION_KEYS);
    if (!Array.isArray(value.cards) || value.cards.length === 0) {
      this.problem(path, "\"cards\" must be a list of at least one card");
    }
    const items = Array.isArray(value.cards) ? value.cards.map((c, i) => this.item(c, `${path}.cards[${i}]`)).filter((c): c is ItemConfig => !!c) : [];
    return {
      kind: "section",
      title: this.string(value, "title", path),
      note: this.string(value, "note", path),
      columns: this.number(value, "columns", path, 1, 12) ?? 1,
      gap: this.number(value, "gap", path, 0, 64),
      items,
    };
  }

  block(value: unknown, path: string): BlockConfig | undefined {
    if (isRaw(value) && "sections" in value) {
      this.keys(value, path, GROUP_KEYS);
      if (!Array.isArray(value.sections) || value.sections.length === 0) {
        this.problem(path, "\"sections\" must be a list of at least one section");
        return undefined;
      }
      const sections = value.sections.map((s, i) => this.section(s, `${path}.sections[${i}]`)).filter((s): s is SectionConfig => !!s);
      return { kind: "columns", columns: this.number(value, "columns", path, 1, 12) ?? sections.length, gap: this.number(value, "gap", path, 0, 64), sections };
    }
    return this.section(value, path);
  }
}

/** Check and normalize the card's YAML. Throws a `DashboardConfigError` listing every problem. */
export function parseDashboardConfig(value: unknown): DashboardConfig {
  const read = new Reader();
  if (!isRaw(value)) throw new DashboardConfigError(["the card config must be a map"]);
  read.keys(value, "", TOP_KEYS);

  let accent: Accent | undefined;
  if (typeof value.accent === "string") {
    accent = ACCENTS[value.accent];
    if (!accent) {
      const near = suggest(value.accent, Object.keys(ACCENTS));
      read.problem("accent", `must be one of ${oneOf(Object.keys(ACCENTS))}, or { chroma, hue }${near ? ` — did you mean "${near}"?` : ""}`);
    }
  } else if (isRaw(value.accent)) {
    read.keys(value.accent, "accent", ["chroma", "hue"]);
    const chroma = read.number(value.accent, "chroma", "accent", 0, 0.37, false);
    const hue = read.number(value.accent, "hue", "accent", 0, 360, false);
    if (chroma !== undefined && hue !== undefined) accent = { chroma, hue };
  } else if (value.accent != null) {
    read.problem("accent", `must be one of ${oneOf(Object.keys(ACCENTS))}, or { chroma, hue }`);
  }

  let blocks: BlockConfig[] | undefined;
  if (value.sections != null) {
    if (!Array.isArray(value.sections) || value.sections.length === 0) read.problem("sections", "must be a list of at least one section, or left out for the automatic layout");
    else blocks = value.sections.map((s, i) => read.block(s, `sections[${i}]`)).filter((b): b is BlockConfig => !!b);
  }

  const config: DashboardConfig = {
    title: read.string(value, "title", "") ?? "Home",
    subtitle: read.string(value, "subtitle", ""),
    showTime: read.boolean(value, "show_time", "") ?? false,
    hourCycle: read.choice(value, "hour_cycle", "", ["h12", "h23"] as const),
    theme: read.choice(value, "theme", "", ["home-assistant", "auto", "light", "dark"] as const) ?? "home-assistant",
    accent,
    blocks,
  };
  if (read.problems.length) throw new DashboardConfigError(read.problems);
  return config;
}

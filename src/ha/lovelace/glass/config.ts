import type { ToggleIcon } from "../../../domains/toggle/types";
import type { GlassSize } from "../../../glass/ui";
import { DashboardConfigError, Reader, TOGGLE_ICONS, isRaw } from "../config";
import type { Raw } from "../config";
import { domainOf } from "../auto";

/*
 * The glass card's YAML (docs/deploy.md → The glass dashboard), checked and normalized with the same reader as
 * the current card, so every mistake shows at once with its path.
 */

export type GlassKind = "light" | "climate" | "toggle" | "weather";

/** Each domain glass draws, and its card. */
export const GLASS_DOMAIN: Record<string, GlassKind> = {
  light: "light",
  climate: "climate",
  weather: "weather",
  input_boolean: "toggle",
  switch: "toggle",
};

export type ToggleDomain = "input_boolean" | "switch";

interface GlassCardBase {
  entity: string;
  name?: string;
  /** Overrides the area Home Assistant's registries resolve; the room bar files the card under it. */
  area?: string;
  size?: GlassSize;
}

/** A toggle carries the native domain its service goes to. */
export type GlassCardConfig = GlassCardBase & (
  | { kind: Exclude<GlassKind, "toggle"> }
  | { kind: "toggle"; domain: ToggleDomain; icon?: ToggleIcon }
);

export interface GlassConfig {
  title: string;
  /** The greeting's name. Default: the signed-in Home Assistant user's. */
  name?: string;
  /** Absent: every light, climate, toggle and weather entity, laid out automatically. */
  cards?: GlassCardConfig[];
}

const SIZES: readonly GlassSize[] = ["s", "m", "l", "xl"];
const TOP_KEYS = ["type", "title", "name", "cards", "view_layout", "grid_options", "visibility"];
const CARD_KEYS = ["entity", "name", "area", "size"];

function card(read: Reader, value: unknown, path: string): GlassCardConfig | undefined {
  if (!isRaw(value) && typeof value !== "string") {
    read.problem(path, "a card is an entity id, or a map with an \"entity\" key");
    return undefined;
  }
  const raw: Raw = typeof value === "string" ? { entity: value } : value;
  if (raw.entity == null) {
    read.problem(path, "a card needs an \"entity\"");
    return undefined;
  }
  const entity = read.entityId(raw.entity, path);
  if (!entity) return undefined;
  const domain = domainOf(entity);
  const kind = GLASS_DOMAIN[domain];
  if (!kind) {
    read.problem(path, `${entity}: ${domain}.* entities have no glass card yet (supported: ${Object.keys(GLASS_DOMAIN).join(", ")})`);
    return undefined;
  }
  const at = `${path} (${entity})`;
  read.keys(raw, at, kind === "toggle" ? [...CARD_KEYS, "icon"] : CARD_KEYS);
  const base: GlassCardBase = { entity, name: read.string(raw, "name", at), area: read.string(raw, "area", at), size: read.choice(raw, "size", at, SIZES) };
  return kind === "toggle"
    ? { ...base, kind, domain: domain as ToggleDomain, icon: read.choice(raw, "icon", at, TOGGLE_ICONS) }
    : { ...base, kind };
}

/** Check and normalize the card's YAML; throws a DashboardConfigError listing every problem. */
export function parseGlassConfig(raw: unknown): GlassConfig {
  const read = new Reader();
  const top: Raw = isRaw(raw) ? raw : {};
  if (raw != null && !isRaw(raw)) read.problem("", "the card's config must be a map");
  read.keys(top, "", TOP_KEYS);
  const title = read.string(top, "title", "") ?? "Home";
  const name = read.string(top, "name", "");
  let cards: GlassCardConfig[] | undefined;
  if (top.cards != null) {
    if (!Array.isArray(top.cards)) read.problem("cards", "must be a list of entity ids or cards");
    else cards = top.cards.flatMap((c, i) => card(read, c, `cards[${i}]`) ?? []);
  }
  if (read.problems.length) throw new DashboardConfigError(read.problems);
  return { title, name, cards };
}

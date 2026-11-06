import { BODY_KEYS, DashboardConfigError, PLACEMENT_KEYS, Reader, isRaw, readBody, readCard, rowTitles } from "@dashhaus/core/lovelace/schema";
import type { CardKindSpec, CardReadSchema, LayoutSchema, Raw, RowConfig } from "@dashhaus/core/lovelace/schema";
import type { NavEntry } from "@dashhaus/core/lovelace";
import { GLASSHOUSE_CARDS } from "./registry";
import type { GlasshouseCardItem } from "./registry";
import type { GlasshouseFootprint } from "../shared/ui";

export type CardConfig = GlasshouseCardItem;
/** A row of the page: its heading, its grid and its Cards, placed by the shared layout (`cards`, or `rows` of them). */
export type RowLayoutConfig = RowConfig<CardConfig>;
export interface PageConfig { id: string; title: string; rows: RowLayoutConfig[] }

export interface GlasshouseConfig {
  title?: string;
  subtitle?: string;
  showTime: boolean;
  hourCycle?: "h12" | "h23";
  footprint: GlasshouseFootprint;
  /** `auto` follows Home Assistant's dark mode; `dark` keeps the night glasshouse, `light` the day one. */
  theme: "auto" | "dark" | "light";
  /** The main page's rows (its `cards` are one untitled row); absent, a row per Home Assistant area. */
  rows?: RowLayoutConfig[];
  pages?: PageConfig[];
  nav?: NavEntry[] | false;
}

const TOP_KEYS = ["type", "title", "subtitle", "show_time", "hour_cycle", "footprint", "theme", ...BODY_KEYS, "pages", "nav", "view_layout", "grid_options", "visibility"];
const CARD_KEYS = ["entity", "card", "name", "area", "footprint", ...PLACEMENT_KEYS, "history"];
const FOOTPRINTS: readonly GlasshouseFootprint[] = ["standard", "compact"];
/** The most columns a row may have. */
const MAX_ACROSS = 4;

/** The generated skin's one Card schema: its registry supplies the kinds, the package reads the rest. */
const CARD_SCHEMA: CardReadSchema<string, CardConfig> = {
  noun: "Card",
  common: CARD_KEYS,
  kinds: GLASSHOUSE_CARDS as unknown as Record<string, CardKindSpec>,
  base: (read, raw, at) => ({
    name: read.string(raw, "name", at),
    area: read.string(raw, "area", at),
    footprint: read.choice(raw, "footprint", at, FOOTPRINTS),
    history: read.boolean(raw, "history", at),
  }),
  noKind: (entity) => `${entity}: its domain has no Glasshouse Card yet`,
};

/** Parse and normalize `custom:dashhaus-glasshouse` YAML, collecting every problem. */
export function parseGlasshouseConfig(value: unknown): GlasshouseConfig {
  const reader = new Reader();
  const raw: Raw = isRaw(value) ? value : {};
  if (!isRaw(value)) reader.problem("", "the Lovelace card config must be a map");
  reader.keys(raw, "", TOP_KEYS);
  const footprint = reader.choice(raw, "footprint", "", FOOTPRINTS) ?? "standard";
  // One footprint per row: this skin's grid rows are one Card tall.
  const layout: LayoutSchema<CardConfig> = {
    noun: "Card",
    maxColumns: MAX_ACROSS,
    item: (read, item, path) => readCard(read, CARD_SCHEMA, item, path),
    footprints: { mix: "uniform", of: (card) => card.footprint ?? footprint },
  };
  const rows = readBody(reader, layout, raw);
  const pages = reader.pages(raw, (body, path) => readBody(reader, layout, body, path))?.map(({ id, title, body }) => ({ id, title, rows: body }));
  const config: GlasshouseConfig = {
    title: reader.string(raw, "title", ""),
    subtitle: reader.string(raw, "subtitle", ""),
    showTime: reader.boolean(raw, "show_time", "") ?? false,
    hourCycle: reader.choice(raw, "hour_cycle", "", ["h12", "h23"] as const),
    footprint,
    theme: reader.choice(raw, "theme", "", ["auto", "dark", "light"] as const) ?? "auto",
    rows,
    pages,
    nav: reader.nav(raw, pages ?? [], rows && rowTitles(rows)),
  };
  if (reader.problems.length) throw new DashboardConfigError(reader.problems);
  return config;
}

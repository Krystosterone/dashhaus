import { DashboardConfigError, Reader, isRaw } from "../../../ha/lovelace";
import type { NavEntry } from "../../../ha/lovelace";
import type { Raw } from "../../../ha/lovelace";
import { __skinVar__CardKindsFor, __skinVar__KindOf } from "./registry";
import type { __Skin__CardItem } from "./registry";
import type { __Skin__Footprint } from "../shared/ui";

export interface CardConfig extends __Skin__CardItem { span?: number }
export interface SectionConfig { kind: "section"; title?: string; note?: string; columns?: number; cards: CardConfig[] }
export interface ColumnsConfig { kind: "columns"; columns: number; sections: SectionConfig[] }
export type BlockConfig = SectionConfig | ColumnsConfig;
export interface PageConfig { id: string; title: string; blocks: BlockConfig[] }

export interface __Skin__Config {
  title?: string;
  subtitle?: string;
  showTime: boolean;
  hourCycle?: "h12" | "h23";
  footprint: __Skin__Footprint;
  cards?: CardConfig[];
  sections?: BlockConfig[];
  pages?: PageConfig[];
  nav?: NavEntry[] | false;
}

export const sectionsOf = (blocks: readonly BlockConfig[]) => blocks.flatMap((block) => block.kind === "columns" ? block.sections : [block]);
export const cardsOf = (blocks: readonly BlockConfig[]) => sectionsOf(blocks).flatMap((section) => section.cards);
export const mapCards = (blocks: readonly BlockConfig[], fn: (card: CardConfig) => CardConfig): BlockConfig[] => blocks.map((block) => block.kind === "columns" ? { ...block, sections: block.sections.map((section) => ({ ...section, cards: section.cards.map(fn) })) } : { ...block, cards: block.cards.map(fn) });

const TOP_KEYS = ["type", "title", "subtitle", "show_time", "hour_cycle", "footprint", "cards", "sections", "pages", "nav", "view_layout", "grid_options", "visibility"];
const CARD_KEYS = ["entity", "card", "name", "area", "footprint", "span", "history"];
const SECTION_KEYS = ["title", "note", "columns", "cards"];
const GROUP_KEYS = ["columns", "sections"];
const FOOTPRINTS: readonly __Skin__Footprint[] = ["standard", "compact"];
const MAX_ACROSS = 4;

class __Skin__Reader extends Reader {
  card(value: unknown, path: string): CardConfig | undefined {
    if (!isRaw(value) && typeof value !== "string") { this.problem(path, "a Card is an entity id, or a map with an entity key"); return undefined; }
    const raw: Raw = typeof value === "string" ? { entity: value } : value;
    if (raw.entity == null) { this.problem(path, "a Card needs an entity"); return undefined; }
    const entity = this.entityId(raw.entity, path);
    if (!entity) return undefined;
    const kinds = __skinVar__CardKindsFor(entity);
    if (!kinds.length) { this.problem(path, `${entity}: its domain has no __Section__ Card yet`); return undefined; }
    const at = `${path} (${entity})`;
    const selected = this.choice(raw, "card", at, kinds);
    const kind = selected ?? __skinVar__KindOf(entity);
    if (!kind) { this.problem(at, `pick its Card with card: one of ${kinds.join(", ")}`); return undefined; }
    this.keys(raw, at, CARD_KEYS);
    return {
      entity,
      kind,
      name: this.string(raw, "name", at),
      area: this.string(raw, "area", at),
      footprint: this.choice(raw, "footprint", at, FOOTPRINTS),
      span: this.number(raw, "span", at, 1, MAX_ACROSS),
      history: this.boolean(raw, "history", at),
    };
  }

  section(value: unknown, path: string): SectionConfig | undefined {
    if (!isRaw(value)) { this.problem(path, "a section is a map with Cards"); return undefined; }
    this.keys(value, path, SECTION_KEYS);
    if (!Array.isArray(value.cards) || value.cards.length === 0) { this.problem(path, "cards must be a list of at least one Card"); return undefined; }
    const columns = this.number(value, "columns", path, 1, MAX_ACROSS);
    const cards = value.cards.flatMap((card, index) => {
      const parsed = this.card(card, `${path}.cards[${index}]`);
      return parsed ? [{ ...parsed, span: Math.min(parsed.span ?? 1, columns ?? MAX_ACROSS) }] : [];
    });
    return { kind: "section", title: this.string(value, "title", path), note: this.string(value, "note", path), columns, cards };
  }

  block(value: unknown, path: string): BlockConfig | undefined {
    if (!isRaw(value) || !("sections" in value)) return this.section(value, path);
    this.keys(value, path, GROUP_KEYS);
    const columns = this.number(value, "columns", path, 1, MAX_ACROSS) ?? 1;
    if (!Array.isArray(value.sections) || value.sections.length === 0) { this.problem(path, "sections must be a list of at least one section"); return undefined; }
    const sections = value.sections.flatMap((section, index) => {
      const parsed = this.section(section, `${path}.sections[${index}]`);
      return parsed ? [parsed] : [];
    });
    return { kind: "columns", columns, sections };
  }
}

/** Parse and normalize `custom:home-dashboard-__skin__` YAML, collecting every problem. */
export function parse__Skin__Config(value: unknown): __Skin__Config {
  const reader = new __Skin__Reader();
  const raw: Raw = isRaw(value) ? value : {};
  if (!isRaw(value)) reader.problem("", "the Lovelace card config must be a map");
  reader.keys(raw, "", TOP_KEYS);
  if (raw.cards != null && raw.sections != null) reader.problem("", "cards and sections both lay out the main page: keep one");
  const list = (key: "cards" | "sections", parse: (value: unknown, path: string) => CardConfig | BlockConfig | undefined) => {
    const values = raw[key];
    if (values == null) return undefined;
    if (!Array.isArray(values) || values.length === 0) { reader.problem("", `${key} must be a list of at least one item`); return undefined; }
    return values.flatMap((item, index) => { const parsed = parse(item, `${key}[${index}]`); return parsed ? [parsed] : []; });
  };
  const cards = list("cards", (item, path) => reader.card(item, path)) as CardConfig[] | undefined;
  const sections = list("sections", (item, path) => reader.block(item, path)) as BlockConfig[] | undefined;
  const pages = reader.pages(raw, (item, path) => reader.block(item, path));
  const titles = sections?.flatMap((block) => sectionsOf([block]).flatMap((section) => section.title ? [section.title] : []));
  const config: __Skin__Config = {
    title: reader.string(raw, "title", ""),
    subtitle: reader.string(raw, "subtitle", ""),
    showTime: reader.boolean(raw, "show_time", "") ?? false,
    hourCycle: reader.choice(raw, "hour_cycle", "", ["h12", "h23"] as const),
    footprint: reader.choice(raw, "footprint", "", FOOTPRINTS) ?? "standard",
    cards,
    sections,
    pages,
    nav: reader.nav(raw, pages ?? [], titles),
  };
  if (reader.problems.length) throw new DashboardConfigError(reader.problems);
  return config;
}

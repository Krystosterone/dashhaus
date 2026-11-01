import { DashboardConfigError, Reader, isRaw } from "@dashhaus/dashboard/schema";

export type CardKind = "light" | "sensor" | "cover";

export interface CardConfig {
  entity: string;
  card: CardKind;
  name?: string;
  area?: string;
}

export interface MySkinConfig {
  title: string;
  cards?: CardConfig[];
}

const KINDS: readonly CardKind[] = ["light", "sensor", "cover"];
const TOP_KEYS = ["type", "title", "cards", "view_layout", "grid_options", "visibility"];
const CARD_KEYS = ["entity", "card", "name", "area"];

/** Which card draws an entity, from its Home Assistant domain. */
export function kindOf(entity: string): CardKind | undefined {
  if (entity.startsWith("light.")) return "light";
  if (entity.startsWith("sensor.")) return "sensor";
  if (entity.startsWith("cover.")) return "cover";
  return undefined;
}

/** Parse and normalize `custom:dashhaus-my-skin` YAML, collecting every problem at its path. */
export function parseMySkinConfig(value: unknown): MySkinConfig {
  const reader = new Reader();
  if (!isRaw(value)) reader.problem("", "the Lovelace card config must be a map");
  const raw = isRaw(value) ? value : {};
  reader.keys(raw, "", TOP_KEYS);

  let cards: CardConfig[] | undefined;
  if (raw.cards != null) {
    if (!Array.isArray(raw.cards) || raw.cards.length === 0) {
      reader.problem("", "cards must be a list of at least one entity");
    } else {
      cards = raw.cards.flatMap((item, index): CardConfig[] => {
        const at = `cards[${index}]`;
        if (!isRaw(item)) {
          reader.problem(at, "a card is a map with an entity");
          return [];
        }
        reader.keys(item, at, CARD_KEYS);
        const entity = reader.entityId(item.entity, `${at}.entity`, ["light", "sensor", "cover"]);
        if (!entity) return [];
        const card = reader.choice(item, "card", at, KINDS) ?? kindOf(entity);
        if (!card) return [];
        return [{ entity, card, name: reader.string(item, "name", at), area: reader.string(item, "area", at) }];
      });
    }
  }

  const config: MySkinConfig = {
    title: reader.string(raw, "title", "") ?? "My Skin",
    cards,
  };
  if (reader.problems.length) throw new DashboardConfigError(reader.problems);
  return config;
}

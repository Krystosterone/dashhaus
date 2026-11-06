/**
 * Each skin's own install (scripts/skin-repositories.js): the strategy its bundle registers, listed in Add dashboard
 * under the skin's name, and how its Lovelace card is listed in the card picker. A skin's bundle is the combined one
 * with only its skin: its entry (`orb.ts`, `field.ts`) defines its card and this strategy, and nothing named Dashhaus.
 * The one trace is where the strategy's documentation link leads: the skin's page, whose foot says what it is drawn on.
 */
import { SKIN_REPOSITORIES, pageUrl } from "../../scripts/skin-repositories.js";
import type { SkinRepository } from "../../scripts/skin-repositories.js";
import { STRATEGY_LOOKS } from "./dashboards";
import { defineStrategies } from "./strategy";
import type { Strategy } from "./strategy";

/** A skin's strategy, `custom:<repository>`: its one look, under its own name. */
export function skinStrategy(entry: SkinRepository): Strategy {
  const look = STRATEGY_LOOKS.find((candidate) => candidate.id === entry.skin);
  if (!look) throw new Error(`no look ${entry.skin}`);
  return { type: entry.repository, name: entry.name, description: entry.description, documentationURL: pageUrl(entry), icon: entry.icon, looks: [look] };
}

export const SKIN_STRATEGIES = Object.fromEntries(SKIN_REPOSITORIES.map((entry) => [entry.skin, skinStrategy(entry)])) as Record<SkinRepository["skin"], Strategy>;

/** How a skin's card reads in the card picker when its own bundle defined it. */
export const PICKER: Record<SkinRepository["skin"], { name: string; description: string }> = {
  orb: { name: "Orb", description: "Orb's whole page from one card. Leave out `cards` and `rows` to lay the house out automatically." },
  field: { name: "Field", description: "Field's whole page from one card: modules by room. Leave out `cards` and `rows` to show every supported entity by area." },
};

/**
 * Define a skin's bundle: its card (with `define`, the skin's own `define<Skin>Card`), listed in the card picker under
 * the skin's name, then its strategy. A card another copy already defined (the combined bundle, loaded first) keeps
 * that copy's entry.
 */
export function defineSkin(entry: SkinRepository, cardTag: string, define: () => void) {
  const fresh = !customElements.get(cardTag);
  define();
  const listed = window.customCards?.find((card) => card.type === cardTag);
  if (fresh && listed) Object.assign(listed, PICKER[entry.skin]);
  defineStrategies(SKIN_STRATEGIES[entry.skin]);
}

/** A skin's entry in the list, by its id. */
export function skinRepository(skin: SkinRepository["skin"]) {
  const entry = SKIN_REPOSITORIES.find((candidate) => candidate.skin === skin);
  if (!entry) throw new Error(`no skin repository for ${skin}`);
  return entry;
}

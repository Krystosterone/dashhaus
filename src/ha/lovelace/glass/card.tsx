import { LovelaceDashboardElement, autoInput, registerCard } from "../element";
import type { LovelaceHass } from "../element";
import { scopeToHost } from "../styles";
import { parseGlassConfig } from "./config";
import type { GlassCardConfig, GlassConfig } from "./config";
import { areaName, autoGlassCards } from "./auto";
import { GlassDashboard } from "./GlassDashboard";

export const GLASS_CARD_TYPE = "home-dashboard-glass";

/** The card fills its view; the glass page paints its own gradient behind the cards, and fills the height under
    Home Assistant's header so the room bar rests at the bottom of a short page. */
const HOST_CSS = `
:host { display: block; height: 100%; }
.gl-page { min-height: calc(100dvh - var(--header-height, 56px)); }
.hd-config-error { margin: 16px; padding: 16px; border-radius: 16px; background: var(--card-solid); color: var(--ink); font: 500 14px/1.5 var(--font); white-space: pre-wrap; }
`;

/**
 * `type: custom:home-dashboard-glass` — the glass UI as a whole page in one Lovelace card, on the frontend's own
 * connection like `custom:home-dashboard`. Without `cards` it draws every light, climate, toggle and weather
 * entity, and the room bar follows Home Assistant's areas.
 */
export function createGlassCard(css: string) {
  const styles = scopeToHost(css) + HOST_CSS;

  return class HomeDashboardGlassCard extends LovelaceDashboardElement<GlassConfig> {
    protected readonly styles = styles;
    #items?: { key: unknown[]; items: GlassCardConfig[] };

    setConfig(raw: unknown) {
      this.#items = undefined;
      super.setConfig(raw);
    }

    /** What the card picker pre-fills: automatic, every supported entity by area. */
    static getStubConfig() {
      return { type: `custom:${GLASS_CARD_TYPE}` };
    }

    protected parse(raw: unknown) {
      return parseGlassConfig(raw);
    }

    protected changed(previous: LovelaceHass, next: LovelaceHass) {
      return previous.user?.name !== next.user?.name || this.#itemsStale(next);
    }

    protected draw(config: GlassConfig, hass: LovelaceHass) {
      return <GlassDashboard title={config.title} name={config.name ?? hass.user?.name} items={this.#itemsFor(config, hass)} />;
    }

    /** The registries and the set of entities decide the cards and their rooms; a state change does not. */
    #key(hass: LovelaceHass): unknown[] {
      return [this.config, hass.entities, hass.devices, hass.areas, Object.keys(hass.states).length];
    }

    #itemsStale(hass: LovelaceHass) {
      const key = this.#key(hass);
      return !this.#items || this.#items.key.some((part, i) => part !== key[i]);
    }

    #itemsFor(config: GlassConfig, hass: LovelaceHass): GlassCardConfig[] {
      if (this.#itemsStale(hass)) {
        const input = autoInput(hass);
        const cards = config.cards ?? autoGlassCards(input);
        this.#items = { key: this.#key(hass), items: cards.map((c) => ({ ...c, area: c.area ?? areaName(input, c.entity) })) };
      }
      return this.#items!.items;
    }
  };
}

/** Register the element and list it in the Lovelace card picker. Safe to call twice. */
export function defineGlassCard(css: string) {
  registerCard(GLASS_CARD_TYPE, createGlassCard(css), "Home Dashboard Glass", "The glass dashboard: translucent cards by room. Leave out `cards` to show every light, climate, toggle and weather entity.");
}

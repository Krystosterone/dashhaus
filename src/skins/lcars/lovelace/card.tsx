import { LovelaceDashboardElement, autoInput, registerCard, scopeToHost } from "@dashhaus/dashboard/skin";
import type { LovelaceHass } from "@dashhaus/dashboard/skin";
import { mapCards, parseLcarsConfig } from "./config";
import type { LcarsConfig, BlockConfig, CardConfig, PageConfig } from "./config";
import { areaName, areaSections, autoCards } from "./auto";
import { LcarsDashboard } from "./LcarsDashboard";
import { LCARS_FONT_HREF, LCARS_THEME_ATTRIBUTE } from "../shared/surface";

export const LCARS_CARD_TYPE = "dashhaus-lcars";
const HOST_CSS = `
:host { display: block; height: 100%; }
.lcars-surface { min-height: calc(100dvh - var(--header-height, 56px)); }
.hd-config-error { margin: 16px; padding: 16px; border: 1px solid var(--lcars-line); border-radius: 12px; background: var(--lcars-card); color: var(--lcars-ink); font: 500 13px/1.5 var(--lcars-sans); white-space: pre-wrap; }
`;

/** `type: custom:dashhaus-lcars` on Home Assistant's own authenticated frontend connection. */
export function createLcarsCard(css: string) {
  const styles = scopeToHost(css) + HOST_CSS;
  return class DashhausLcarsCard extends LovelaceDashboardElement<LcarsConfig> {
    protected readonly styles = styles;
    protected readonly mountClass = "lcars-surface";
    protected readonly fontHref = LCARS_FONT_HREF;
    #layout?: { key: unknown[]; blocks: BlockConfig[]; pages?: PageConfig[] };

    static getStubConfig() { return { type: `custom:${LCARS_CARD_TYPE}` }; }
    protected parse(raw: unknown) { return parseLcarsConfig(raw); }
    protected changed(previous: LovelaceHass, next: LovelaceHass) { return previous.themes?.darkMode !== next.themes?.darkMode || previous.panels !== next.panels || this.#stale(next); }
    /** Home Assistant's dark mode, on the skin's own theme attribute (tokens.css). */
    protected paintHost(_config: LcarsConfig, hass: LovelaceHass) { this.setAttribute(LCARS_THEME_ATTRIBUTE, hass.themes?.darkMode ? "dark" : "light"); }
    protected draw(config: LcarsConfig, hass: LovelaceHass) {
      const layout = this.#layoutFor(config, hass);
      return <LcarsDashboard title={config.title} subtitle={config.subtitle} showTime={config.showTime} hourCycle={config.hourCycle} blocks={layout.blocks} pages={layout.pages} nav={config.nav} footprint={config.footprint} panels={hass.panels} />;
    }
    #key(hass: LovelaceHass): unknown[] { return [this.config, hass.entities, hass.devices, hass.areas, Object.keys(hass.states).length]; }
    #stale(hass: LovelaceHass) { const next = this.#key(hass); return !this.#layout || next.some((value, index) => value !== this.#layout!.key[index]); }
    #layoutFor(config: LcarsConfig, hass: LovelaceHass) {
      const key = this.#key(hass);
      if (this.#layout && !key.some((value, index) => value !== this.#layout!.key[index])) return this.#layout;
      const input = autoInput(hass);
      const place = (card: CardConfig): CardConfig => ({ ...card, area: card.area ?? areaName(input, card.entity) });
      const cards = (config.cards ?? autoCards(input)).map(place);
      const blocks = config.sections ? mapCards(config.sections, place) : areaSections(cards);
      const pages = config.pages?.map((page) => ({ ...page, blocks: mapCards(page.blocks, place) }));
      return this.#layout = { key, blocks, pages };
    }
  };
}

export function defineLcarsCard(css: string) {
  registerCard(LCARS_CARD_TYPE, createLcarsCard(css), "Dashhaus Lcars", "The Lcars dashboard. Without cards, it groups every entity it can draw by area.");
}

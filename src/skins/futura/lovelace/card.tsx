import { LovelaceDashboardElement, autoInput, registerCard, scopeToHost } from "@dashhaus/core/lovelace/skin";
import type { LovelaceHass } from "@dashhaus/core/lovelace/skin";
import { mapRowItems } from "@dashhaus/core/lovelace/schema";
import { parseFuturaConfig } from "./config";
import type { FuturaConfig, CardConfig, PageConfig, RowLayoutConfig } from "./config";
import { areaName, areaRows, autoCards } from "./auto";
import { FuturaDashboard } from "./FuturaDashboard";
import { FUTURA_FONT_HREF } from "../shared/fonts";

export const FUTURA_CARD_TYPE = "dashhaus-futura";
const HOST_CSS = `
:host { display: block; height: 100%; }
.futura-surface { min-height: calc(100dvh - var(--header-height, 56px)); }
.hd-config-error { margin: 16px; padding: 16px; border: 1px dashed var(--futura-edge-bright); border-radius: 12px; background: var(--futura-panel); color: var(--futura-ink); font: 500 13px/1.5 var(--futura-mono); white-space: pre-wrap; }
`;

/** `type: custom:dashhaus-futura` on Home Assistant's own authenticated frontend connection. */
export function createFuturaCard(css: string) {
  const styles = scopeToHost(css) + HOST_CSS;
  return class DashhausFuturaCard extends LovelaceDashboardElement<FuturaConfig> {
    protected readonly styles = styles;
    protected readonly mountClass = "futura-surface";
    protected readonly fontHref = FUTURA_FONT_HREF;
    #layout?: { key: unknown[]; rows: RowLayoutConfig[]; pages?: PageConfig[] };

    static getStubConfig() { return { type: `custom:${FUTURA_CARD_TYPE}` }; }
    protected parse(raw: unknown) { return parseFuturaConfig(raw); }
    protected changed(previous: LovelaceHass, next: LovelaceHass) { return previous.themes?.darkMode !== next.themes?.darkMode || previous.panels !== next.panels || this.#stale(next); }
    /** Home Assistant's light theme gets Futura's daylight values; its dark theme, the console. */
    protected paintHost(_config: FuturaConfig, hass: LovelaceHass) { this.setAttribute("data-futura-theme", hass.themes?.darkMode ? "dark" : "light"); }
    protected draw(config: FuturaConfig, hass: LovelaceHass) {
      const layout = this.#layoutFor(config, hass);
      return <FuturaDashboard title={config.title} subtitle={config.subtitle} showTime={config.showTime} hourCycle={config.hourCycle} rows={layout.rows} pages={layout.pages} nav={config.nav} footprint={config.footprint} panels={hass.panels} />;
    }
    #key(hass: LovelaceHass): unknown[] { return [this.config, hass.entities, hass.devices, hass.areas, Object.keys(hass.states).length]; }
    #stale(hass: LovelaceHass) { const next = this.#key(hass); return !this.#layout || next.some((value, index) => value !== this.#layout!.key[index]); }
    #layoutFor(config: FuturaConfig, hass: LovelaceHass) {
      const key = this.#key(hass);
      if (this.#layout && !key.some((value, index) => value !== this.#layout!.key[index])) return this.#layout;
      const input = autoInput(hass);
      const place = (card: CardConfig): CardConfig => ({ ...card, area: card.area ?? areaName(input, card.entity) });
      const rows = config.rows ? mapRowItems(config.rows, place) : areaRows(autoCards(input).map(place));
      const pages = config.pages?.map((page) => ({ ...page, rows: mapRowItems(page.rows, place) }));
      return this.#layout = { key, rows, pages };
    }
  };
}

export function defineFuturaCard(css: string) {
  registerCard(FUTURA_CARD_TYPE, createFuturaCard(css), "Dashhaus Futura", "The Futura dashboard. Add Cards with the normal Card generator; omit cards and rows to group supported entities by area.");
}

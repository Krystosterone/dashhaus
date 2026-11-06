import { LovelaceDashboardElement, autoInput, registerCard, scopeToHost } from "@dashhaus/core/lovelace/skin";
import type { LovelaceHass } from "@dashhaus/core/lovelace/skin";
import { mapRowItems } from "@dashhaus/core/lovelace/schema";
import { parseTitanConfig } from "./config";
import type { TitanConfig, CardConfig, PageConfig, RowLayoutConfig } from "./config";
import { areaName, areaRows, autoCards } from "./auto";
import { TitanDashboard } from "./TitanDashboard";
import { TITAN_FONT_HREF, TITAN_THEME_ATTRIBUTE } from "../shared/surface";

export const TITAN_CARD_TYPE = "dashhaus-titan";
const HOST_CSS = `
:host { display: block; height: 100%; }
.titan-surface { min-height: calc(100dvh - var(--header-height, 56px)); }
.hd-config-error { margin: 16px; padding: 16px 16px 16px 40px; border-left: 22px solid var(--titan-alert); background: var(--titan-page); color: var(--titan-ink); font: 400 14px/1.5 var(--titan-sans); letter-spacing: 0.02em; white-space: pre-wrap; }
`;

/** `type: custom:dashhaus-titan` on Home Assistant's own authenticated frontend connection. */
export function createTitanCard(css: string) {
  const styles = scopeToHost(css) + HOST_CSS;
  return class DashhausTitanCard extends LovelaceDashboardElement<TitanConfig> {
    protected readonly styles = styles;
    protected readonly mountClass = "titan-surface";
    protected readonly fontHref = TITAN_FONT_HREF;
    #layout?: { key: unknown[]; rows: RowLayoutConfig[]; pages?: PageConfig[] };

    static getStubConfig() { return { type: `custom:${TITAN_CARD_TYPE}` }; }
    protected parse(raw: unknown) { return parseTitanConfig(raw); }
    protected changed(previous: LovelaceHass, next: LovelaceHass) { return previous.themes?.darkMode !== next.themes?.darkMode || previous.panels !== next.panels || this.#stale(next); }
    /** Home Assistant's dark mode, on the skin's own theme attribute (tokens.css). */
    protected paintHost(_config: TitanConfig, hass: LovelaceHass) { this.setAttribute(TITAN_THEME_ATTRIBUTE, hass.themes?.darkMode ? "dark" : "light"); }
    protected draw(config: TitanConfig, hass: LovelaceHass) {
      const layout = this.#layoutFor(config, hass);
      return <TitanDashboard title={config.title} subtitle={config.subtitle} showTime={config.showTime} hourCycle={config.hourCycle} rows={layout.rows} pages={layout.pages} nav={config.nav} footprint={config.footprint} panels={hass.panels} />;
    }
    #key(hass: LovelaceHass): unknown[] { return [this.config, hass.entities, hass.devices, hass.areas, Object.keys(hass.states).length]; }
    #stale(hass: LovelaceHass) { const next = this.#key(hass); return !this.#layout || next.some((value, index) => value !== this.#layout!.key[index]); }
    #layoutFor(config: TitanConfig, hass: LovelaceHass) {
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

export function defineTitanCard(css: string) {
  registerCard(TITAN_CARD_TYPE, createTitanCard(css), "Dashhaus Titan", "The Titan dashboard. Without cards or rows, it groups every entity it can draw by area.");
}

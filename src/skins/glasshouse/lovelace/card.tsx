import { LovelaceDashboardElement, autoInput, registerCard, scopeToHost } from "@dashhaus/core/lovelace/skin";
import type { LovelaceHass } from "@dashhaus/core/lovelace/skin";
import { mapRowItems } from "@dashhaus/core/lovelace/schema";
import { parseGlasshouseConfig } from "./config";
import type { GlasshouseConfig, CardConfig, PageConfig, RowLayoutConfig } from "./config";
import { areaName, autoCards, glassRows } from "./auto";
import { GlasshouseDashboard } from "./GlasshouseDashboard";
import { GLASSHOUSE_FONT_HREF, GLASSHOUSE_THEME_ATTRIBUTE } from "../shared/surface";

export const GLASSHOUSE_CARD_TYPE = "dashhaus-glasshouse";
const HOST_CSS = `
:host { display: block; height: 100%; }
.glasshouse-surface { min-height: calc(100dvh - var(--header-height, 56px)); }
.hd-config-error { margin: 16px; padding: 16px; border: 1px solid var(--glasshouse-line); border-radius: 12px; background: var(--glasshouse-card); color: var(--glasshouse-ink); font: 500 13px/1.5 var(--glasshouse-sans); white-space: pre-wrap; }
`;

/** `type: custom:dashhaus-glasshouse` on Home Assistant's own authenticated frontend connection. */
export function createGlasshouseCard(css: string) {
  const styles = scopeToHost(css) + HOST_CSS;
  return class DashhausGlasshouseCard extends LovelaceDashboardElement<GlasshouseConfig> {
    protected readonly styles = styles;
    protected readonly mountClass = "glasshouse-surface";
    protected readonly fontHref = GLASSHOUSE_FONT_HREF;
    #layout?: { key: unknown[]; rows: RowLayoutConfig[]; pages?: PageConfig[] };

    static getStubConfig() { return { type: `custom:${GLASSHOUSE_CARD_TYPE}` }; }
    protected parse(raw: unknown) { return parseGlasshouseConfig(raw); }
    protected changed(previous: LovelaceHass, next: LovelaceHass) { return previous.themes?.darkMode !== next.themes?.darkMode || previous.panels !== next.panels || this.#stale(next); }
    /** Home Assistant's dark mode, or the YAML's `theme`, on the skin's own theme attribute (tokens.css). */
    protected paintHost(config: GlasshouseConfig, hass: LovelaceHass) { this.setAttribute(GLASSHOUSE_THEME_ATTRIBUTE, config.theme !== "auto" ? config.theme : hass.themes?.darkMode ? "dark" : "light"); }
    protected draw(config: GlasshouseConfig, hass: LovelaceHass) {
      const layout = this.#layoutFor(config, hass);
      return <GlasshouseDashboard title={config.title} subtitle={config.subtitle} showTime={config.showTime} hourCycle={config.hourCycle} rows={layout.rows} pages={layout.pages} nav={config.nav} footprint={config.footprint} panels={hass.panels} />;
    }
    #key(hass: LovelaceHass): unknown[] { return [this.config, hass.entities, hass.devices, hass.areas, Object.keys(hass.states).length]; }
    #stale(hass: LovelaceHass) { const next = this.#key(hass); return !this.#layout || next.some((value, index) => value !== this.#layout!.key[index]); }
    #layoutFor(config: GlasshouseConfig, hass: LovelaceHass) {
      const key = this.#key(hass);
      if (this.#layout && !key.some((value, index) => value !== this.#layout!.key[index])) return this.#layout;
      const input = autoInput(hass);
      const place = (card: CardConfig): CardConfig => ({ ...card, area: card.area ?? areaName(input, card.entity) });
      const rows = config.rows ? mapRowItems(config.rows, place) : glassRows(autoCards(input).map(place));
      const pages = config.pages?.map((page) => ({ ...page, rows: mapRowItems(page.rows, place) }));
      return this.#layout = { key, rows, pages };
    }
  };
}

export function defineGlasshouseCard(css: string) {
  registerCard(GLASSHOUSE_CARD_TYPE, createGlasshouseCard(css), "Dashhaus Glasshouse", "The Glasshouse dashboard. Without cards or rows, it groups every entity it can draw by area.");
}

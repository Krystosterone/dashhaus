import { LovelaceDashboardElement, autoInput, registerCard, scopeToHost } from "@dashhaus/core/lovelace/skin";
import type { LovelaceHass } from "@dashhaus/core/lovelace/skin";
import { mapRowItems } from "@dashhaus/core/lovelace/schema";
import { parse__Skin__Config } from "./config";
import type { __Skin__Config, CardConfig, PageConfig, RowLayoutConfig } from "./config";
import { areaName, areaRows, autoCards } from "./auto";
import { __Skin__Dashboard } from "./__Skin__Dashboard";
import { __SKIN_CONST___FONT_HREF, __SKIN_CONST___THEME_ATTRIBUTE } from "../shared/surface";

export const __SKIN_CONST___CARD_TYPE = "dashhaus-__skin__";
const HOST_CSS = `
:host { display: block; height: 100%; }
.__skin__-surface { min-height: calc(100dvh - var(--header-height, 56px)); }
.hd-config-error { margin: 16px; padding: 16px; border: 1px solid var(--__skin__-line); border-radius: 12px; background: var(--__skin__-card); color: var(--__skin__-ink); font: 500 13px/1.5 var(--__skin__-sans); white-space: pre-wrap; }
`;

/** `type: custom:dashhaus-__skin__` on Home Assistant's own authenticated frontend connection. */
export function create__Skin__Card(css: string) {
  const styles = scopeToHost(css) + HOST_CSS;
  return class Dashhaus__Skin__Card extends LovelaceDashboardElement<__Skin__Config> {
    protected readonly styles = styles;
    protected readonly mountClass = "__skin__-surface";
    protected readonly fontHref = __SKIN_CONST___FONT_HREF;
    #layout?: { key: unknown[]; rows: RowLayoutConfig[]; pages?: PageConfig[] };

    static getStubConfig() { return { type: `custom:${__SKIN_CONST___CARD_TYPE}` }; }
    protected parse(raw: unknown) { return parse__Skin__Config(raw); }
    protected changed(previous: LovelaceHass, next: LovelaceHass) { return previous.themes?.darkMode !== next.themes?.darkMode || previous.panels !== next.panels || this.#stale(next); }
    /** Home Assistant's dark mode, on the skin's own theme attribute (tokens.css). */
    protected paintHost(_config: __Skin__Config, hass: LovelaceHass) { this.setAttribute(__SKIN_CONST___THEME_ATTRIBUTE, hass.themes?.darkMode ? "dark" : "light"); }
    protected draw(config: __Skin__Config, hass: LovelaceHass) {
      const layout = this.#layoutFor(config, hass);
      return <__Skin__Dashboard title={config.title} subtitle={config.subtitle} showTime={config.showTime} hourCycle={config.hourCycle} rows={layout.rows} pages={layout.pages} nav={config.nav} footprint={config.footprint} panels={hass.panels} />;
    }
    #key(hass: LovelaceHass): unknown[] { return [this.config, hass.entities, hass.devices, hass.areas, Object.keys(hass.states).length]; }
    #stale(hass: LovelaceHass) { const next = this.#key(hass); return !this.#layout || next.some((value, index) => value !== this.#layout!.key[index]); }
    #layoutFor(config: __Skin__Config, hass: LovelaceHass) {
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

export function define__Skin__Card(css: string) {
  registerCard(__SKIN_CONST___CARD_TYPE, create__Skin__Card(css), "Dashhaus __Section__", "The __Section__ dashboard. Without cards or rows, it groups every entity it can draw by area.");
}

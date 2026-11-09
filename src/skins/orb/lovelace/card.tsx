import { autoDashboard } from "./auto";
import { parseDashboardConfig } from "./config";
import type { DashboardConfig, RowLayoutConfig } from "./config";
import { ConfigDashboard } from "./ConfigDashboard";
import { LovelaceDashboardElement, autoInput, registerCard, scopeToHost } from "@dashhaus/core/lovelace/skin";
import type { LovelaceHass } from "@dashhaus/core/lovelace/skin";
import { ORB_FONT_HREF, ORB_THEME_ATTRIBUTE } from "../shared/surface";

export const CARD_TYPE = "dashhaus-orb";
export { ORB_STRATEGY } from "./strategy";


/** The card fills its view; tokens.css's dashboard surface paints the page behind it. Home Assistant's toolbar
    (`--header-height`, plus the notch) sits over the top of the view, so a nav jump stops below it. */
const HOST_CSS = `
:host { display: block; height: 100%; }
.ha-surface { min-height: 100%; }
.dash[data-nav] { min-height: calc(100dvh - var(--header-height, 56px)); }
.dash { --dash-scroll-offset: calc(var(--header-height, 56px) + var(--safe-area-inset-top, 0px)); }
.hd-config-error { margin: 16px; padding: 16px; border-radius: 16px; background: var(--card-solid); color: var(--ink); font: 500 14px/1.5 var(--font); white-space: pre-wrap; }
`;

/**
 * `type: custom:dashhaus-orb` — a whole dashboard page in one Lovelace card. Lovelace gives it the
 * config and a live `hass`; it reuses the frontend's own websocket connection, so it needs no token.
 */
export function createDashhausCard(css: string): CustomElementConstructor {
  const styles = scopeToHost(css) + HOST_CSS;

  return class DashhausCard extends LovelaceDashboardElement<DashboardConfig> {
    protected readonly styles = styles;
    protected readonly mountClass = "ha-surface";
    protected readonly fontHref = ORB_FONT_HREF;
    #auto?: { key: unknown[]; rows: RowLayoutConfig[] };

    setConfig(raw: unknown) {
      this.#auto = undefined;
      super.setConfig(raw);
    }

    /**
     * What the card picker pre-fills: the automatic layout spelled out, ready to edit, with the energy preferences an
     * automatic card on this connection has already read.
     */
    static getStubConfig(hass: LovelaceHass) {
      return autoDashboard(autoInput(hass, DashhausCard.heldEnergyPrefs(hass)));
    }

    protected parse(raw: unknown) {
      return parseDashboardConfig(raw);
    }

    protected changed(previous: LovelaceHass, next: LovelaceHass) {
      return previous.themes?.darkMode !== next.themes?.darkMode || previous.panels !== next.panels || (!this.config?.rows && this.#autoStale(next));
    }

    protected paintHost(config: DashboardConfig, hass: LovelaceHass) {
      const theme = config.theme === "home-assistant" ? (hass.themes?.darkMode ? "dark" : "light") : config.theme;
      if (theme === "auto") this.removeAttribute(ORB_THEME_ATTRIBUTE);
      else this.setAttribute(ORB_THEME_ATTRIBUTE, theme);
      if (config.accent) {
        this.style.setProperty("--brand-c", String(config.accent.chroma));
        this.style.setProperty("--brand-h", String(config.accent.hue));
      } else {
        this.style.removeProperty("--brand-c");
        this.style.removeProperty("--brand-h");
      }
    }

    protected draw(config: DashboardConfig, hass: LovelaceHass) {
      return <ConfigDashboard config={{ ...config, rows: this.#rows(config, hass) }} panels={hass.panels} />;
    }

    /** The registries, the set of entities and the energy preferences decide the automatic rows; a state change does not. */
    #autoKey(hass: LovelaceHass): unknown[] {
      return [hass.entities, hass.devices, hass.areas, hass.floors, Object.keys(hass.states).length, this.energyPrefs(hass)];
    }

    #autoStale(hass: LovelaceHass) {
      const key = this.#autoKey(hass);
      return !this.#auto || this.#auto.key.some((part, i) => part !== key[i]);
    }

    #rows(config: DashboardConfig, hass: LovelaceHass): RowLayoutConfig[] {
      if (config.rows) return config.rows;
      if (this.#autoStale(hass)) {
        const generated = parseDashboardConfig({ ...autoDashboard(autoInput(hass, this.energyPrefs(hass)), config.title, { layout: config.layout }), title: config.title });
        this.#auto = { key: this.#autoKey(hass), rows: generated.rows ?? [] };
      }
      return this.#auto!.rows;
    }
  };
}

/** Register the element and list it in the Lovelace card picker. Safe to call twice. */
export function defineDashhausCard(css: string) {
  registerCard(CARD_TYPE, createDashhausCard(css), "Orb", "Orb's whole page from one YAML card. Leave out `cards` and `rows` to lay the house out automatically; `layout: wall` lays it out one column per area.");
}

import { autoDashboard } from "./auto";
import { parseDashboardConfig } from "./config";
import type { BlockConfig, DashboardConfig } from "./config";
import { ConfigDashboard } from "./ConfigDashboard";
import { LovelaceDashboardElement, autoInput, registerCard } from "@scope/dashboard";
import type { LovelaceHass } from "@scope/dashboard";
import { scopeToHost } from "@scope/dashboard";

export const CARD_TYPE = "home-dashboard";

/** Orb's typeface, Urbanist. */
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700&display=swap";

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
 * `type: custom:home-dashboard` — a whole dashboard page in one Lovelace card. Lovelace gives it the
 * config and a live `hass`; it reuses the frontend's own websocket connection, so it needs no token.
 */
export function createHomeDashboardCard(css: string) {
  const styles = scopeToHost(css) + HOST_CSS;

  return class HomeDashboardCard extends LovelaceDashboardElement<DashboardConfig> {
    protected readonly styles = styles;
    protected readonly mountClass = "ha-surface";
    protected readonly fontHref = FONT_HREF;
    #auto?: { key: unknown[]; blocks: BlockConfig[] };

    setConfig(raw: unknown) {
      this.#auto = undefined;
      super.setConfig(raw);
    }

    /** What the card picker pre-fills: the automatic layout spelled out, ready to edit. */
    static getStubConfig(hass: LovelaceHass) {
      return autoDashboard(autoInput(hass));
    }

    protected parse(raw: unknown) {
      return parseDashboardConfig(raw);
    }

    protected changed(previous: LovelaceHass, next: LovelaceHass) {
      return previous.themes?.darkMode !== next.themes?.darkMode || previous.panels !== next.panels || (!this.config?.blocks && this.#autoStale(next));
    }

    protected paintHost(config: DashboardConfig, hass: LovelaceHass) {
      const theme = config.theme === "home-assistant" ? (hass.themes?.darkMode ? "dark" : "light") : config.theme;
      if (theme === "auto") this.removeAttribute("data-theme");
      else this.setAttribute("data-theme", theme);
      if (config.accent) {
        this.style.setProperty("--brand-c", String(config.accent.chroma));
        this.style.setProperty("--brand-h", String(config.accent.hue));
      } else {
        this.style.removeProperty("--brand-c");
        this.style.removeProperty("--brand-h");
      }
    }

    protected draw(config: DashboardConfig, hass: LovelaceHass) {
      return <ConfigDashboard config={{ ...config, blocks: this.#blocks(config, hass) }} panels={hass.panels} />;
    }

    #autoStale(hass: LovelaceHass) {
      const key = [hass.entities, hass.devices, hass.areas, Object.keys(hass.states).length];
      return !this.#auto || this.#auto.key.some((part, i) => part !== key[i]);
    }

    #blocks(config: DashboardConfig, hass: LovelaceHass): BlockConfig[] {
      if (config.blocks) return config.blocks;
      if (this.#autoStale(hass)) {
        const generated = parseDashboardConfig({ ...autoDashboard(autoInput(hass)), title: config.title });
        this.#auto = { key: [hass.entities, hass.devices, hass.areas, Object.keys(hass.states).length], blocks: generated.blocks ?? [] };
      }
      return this.#auto!.blocks;
    }
  };
}

/** Register the element and list it in the Lovelace card picker. Safe to call twice. */
export function defineHomeDashboardCard(css: string) {
  registerCard(CARD_TYPE, createHomeDashboardCard(css), "Home Dashboard", "A whole dashboard page from one YAML card. Leave out `sections` to lay the house out automatically.");
}

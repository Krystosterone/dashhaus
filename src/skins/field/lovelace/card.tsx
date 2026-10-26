import { LovelaceDashboardElement, autoInput, registerCard } from "../../../ha/lovelace/element";
import type { LovelaceHass } from "../../../ha/lovelace/element";
import { scopeToHost } from "../../../ha/lovelace/styles";
import { parseFieldConfig } from "./config";
import type { FieldConfig, ModuleConfig } from "./config";
import { areaName, autoModules } from "./auto";
import { FieldDashboard } from "./FieldDashboard";

export const FIELD_CARD_TYPE = "home-dashboard-field";

/** Field's typeface, Archivo, with its width axis (the skin sets it wide). */
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,300..700&display=swap";

/** The card fills its view, under Home Assistant's toolbar; the field surface paints the page behind it. */
const HOST_CSS = `
:host { display: block; height: 100%; }
.fd-surface { min-height: calc(100dvh - var(--header-height, 56px)); }
.hd-config-error { margin: 16px; padding: 16px; border: 1px solid var(--fd-hairline); border-radius: 4px; background: var(--fd-module); color: var(--fd-ink); font: 500 13px/1.5 var(--fd-sans); white-space: pre-wrap; }
`;

/**
 * `type: custom:home-dashboard-field` — the field skin as a whole page in one Lovelace card, on the frontend's own
 * connection like `custom:home-dashboard`. Without `modules` it draws every supported light and climate entity,
 * grouped by Home Assistant's areas.
 */
export function createFieldCard(css: string) {
  const styles = scopeToHost(css) + HOST_CSS;

  return class HomeDashboardFieldCard extends LovelaceDashboardElement<FieldConfig> {
    protected readonly styles = styles;
    protected readonly mountClass = "fd-surface";
    protected readonly fontHref = FONT_HREF;
    #items?: { key: unknown[]; items: ModuleConfig[] };

    setConfig(raw: unknown) {
      this.#items = undefined;
      super.setConfig(raw);
    }

    /** What the card picker pre-fills: automatic, every supported entity by area. */
    static getStubConfig() {
      return { type: `custom:${FIELD_CARD_TYPE}` };
    }

    protected parse(raw: unknown) {
      return parseFieldConfig(raw);
    }

    protected changed(previous: LovelaceHass, next: LovelaceHass) {
      return previous.themes?.darkMode !== next.themes?.darkMode || this.#itemsStale(next);
    }

    protected paintHost(config: FieldConfig, hass: LovelaceHass) {
      const finish = config.finish === "home-assistant" ? (hass.themes?.darkMode ? "black" : "alloy") : config.finish;
      if (finish === "auto") this.removeAttribute("data-fd-finish");
      else this.setAttribute("data-fd-finish", finish);
    }

    protected draw(config: FieldConfig, hass: LovelaceHass) {
      return <FieldDashboard title={config.title} items={this.#itemsFor(config, hass)} footprint={config.footprint} />;
    }

    /** The registries and the set of entities decide the modules and their areas; a state change does not. */
    #key(hass: LovelaceHass): unknown[] {
      return [this.config, hass.entities, hass.devices, hass.areas, Object.keys(hass.states).length];
    }

    #itemsStale(hass: LovelaceHass) {
      const key = this.#key(hass);
      return !this.#items || this.#items.key.some((part, i) => part !== key[i]);
    }

    #itemsFor(config: FieldConfig, hass: LovelaceHass): ModuleConfig[] {
      if (this.#itemsStale(hass)) {
        const input = autoInput(hass);
        const modules = config.modules ?? autoModules(input);
        this.#items = { key: this.#key(hass), items: modules.map((m) => ({ ...m, area: m.area ?? areaName(input, m.entity) })) };
      }
      return this.#items!.items;
    }
  };
}

/** Register the element and list it in the Lovelace card picker. Safe to call twice. */
export function defineFieldCard(css: string) {
  registerCard(FIELD_CARD_TYPE, createFieldCard(css), "Home Dashboard Field", "The field dashboard: hardware-style light and climate modules by room. Leave out `modules` to show every supported entity.");
}

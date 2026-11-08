import { LovelaceDashboardElement, autoInput, registerCard, scopeToHost } from "@dashhaus/core/lovelace/skin";
import type { LovelaceHass } from "@dashhaus/core/lovelace/skin";
import { mapRowItems } from "@dashhaus/core/lovelace/schema";
import { parseFieldConfig } from "./config";
import type { FieldConfig, FieldRow, ModuleConfig, PageConfig } from "./config";
import { areaName, areaRows, autoModules, energyModules } from "./auto";
import { FieldDashboard } from "./FieldDashboard";
import { FIELD_FONT_HREF } from "../shared/surface";

export const FIELD_CARD_TYPE = "dashhaus-field";
export { FIELD_STRATEGY } from "./strategy";

/** The card fills its view, under Home Assistant's toolbar; the field surface paints the page behind it. The toolbar
    (`--header-height`, plus the notch) sits over the top of the view, so a nav jump stops below it. */
const HOST_CSS = `
:host { display: block; height: 100%; }
.fd-surface { min-height: calc(100dvh - var(--header-height, 56px)); }
.fd-dash[data-nav] { min-height: calc(100dvh - var(--header-height, 56px)); }
.fd-dash { --fd-scroll-offset: calc(var(--header-height, 56px) + var(--safe-area-inset-top, 0px)); }
.hd-config-error { margin: 16px; padding: 16px; border: 1px solid var(--fd-hairline); border-radius: 4px; background: var(--fd-module); color: var(--fd-ink); font: 500 13px/1.5 var(--fd-sans); white-space: pre-wrap; }
`;

/**
 * `type: custom:dashhaus-field` — the field skin as a whole page in one Lovelace card, on the frontend's own
 * connection like `custom:dashhaus-orb`. Without `cards` or `rows` it draws every supported entity, a row per Home
 * Assistant area, then the house's energy.
 */
export function createFieldCard(css: string): CustomElementConstructor {
  const styles = scopeToHost(css) + HOST_CSS;

  return class DashhausFieldCard extends LovelaceDashboardElement<FieldConfig> {
    protected readonly styles = styles;
    protected readonly mountClass = "fd-surface";
    protected readonly fontHref = FIELD_FONT_HREF;
    #layout?: { key: unknown[]; rows: FieldRow[]; pages?: PageConfig[] };

    setConfig(raw: unknown) {
      this.#layout = undefined;
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
      return previous.themes?.darkMode !== next.themes?.darkMode || previous.panels !== next.panels || this.#layoutStale(next);
    }

    protected paintHost(config: FieldConfig, hass: LovelaceHass) {
      const finish = config.finish === "home-assistant" ? (hass.themes?.darkMode ? "black" : "alloy") : config.finish;
      if (finish === "auto") this.removeAttribute("data-fd-finish");
      else this.setAttribute("data-fd-finish", finish);
    }

    protected draw(config: FieldConfig, hass: LovelaceHass) {
      const { rows, pages } = this.#layoutFor(config, hass);
      return (
        <FieldDashboard
          title={config.title}
          subtitle={config.subtitle}
          showTime={config.showTime}
          hourCycle={config.hourCycle}
          viewing={config.viewing}
          rows={rows}
          pages={pages}
          nav={config.nav}
          footprint={config.footprint}
          quiet={config.quiet}
          stills={config.stills}
          panels={hass.panels}
        />
      );
    }

    /**
     * The registries and the set of entities decide the modules and their areas, and on the automatic path the energy
     * preferences decide its Energy row; a state change does not.
     */
    #key(hass: LovelaceHass): unknown[] {
      return [this.config, hass.entities, hass.devices, hass.areas, Object.keys(hass.states).length, this.#energy(hass)];
    }

    /** The energy preferences, read only for the automatic layout: a page laid out in YAML never asks. */
    #energy(hass: LovelaceHass) {
      return this.config && !this.config.rows ? this.energyPrefs(hass) : undefined;
    }

    #layoutStale(hass: LovelaceHass) {
      const key = this.#key(hass);
      return !this.#layout || this.#layout.key.some((part, i) => part !== key[i]);
    }

    /**
     * The main page, its rows or the automatic layout's row per area, and the pages, every module with its area from
     * the YAML or, failing that, the registries.
     */
    #layoutFor(config: FieldConfig, hass: LovelaceHass) {
      if (this.#layoutStale(hass)) {
        const input = autoInput(hass, this.#energy(hass));
        const place = (m: ModuleConfig): ModuleConfig => ({ ...m, area: m.area ?? areaName(input, m.entity) });
        const modules = config.rows ? [] : autoModules(input);
        const rows = config.rows ? mapRowItems(config.rows, place) : areaRows(modules.map(place), energyModules(input, modules).map(place));
        const pages = config.pages?.map((p) => ({ ...p, rows: mapRowItems(p.rows, place) }));
        this.#layout = { key: this.#key(hass), rows, pages };
      }
      return this.#layout!;
    }
  };
}

/** Register the element and list it in the Lovelace card picker. Safe to call twice. */
export function defineFieldCard(css: string) {
  registerCard(FIELD_CARD_TYPE, createFieldCard(css), "Field", "Field's whole page from one YAML card: hardware-style light, climate and sensor modules by room. Leave out `cards` and `rows` to show every supported entity by area.");
}

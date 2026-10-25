import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { HaProvider } from "../../provider";
import { createHaStore } from "../../store";
import { createHomeAssistantTransport } from "../../home-assistant";
import type { HaStore } from "../../types";
import { ErrorBoundary, autoInput, loadFont } from "../card";
import type { LovelaceHass } from "../card";
import { scopeToHost } from "../styles";
import { parseGlassConfig } from "./config";
import type { GlassConfig } from "./config";
import { areaName, autoGlassCards } from "./auto";
import { GlassDashboard } from "./GlassDashboard";
import type { GlassItem } from "./GlassDashboard";

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

  return class HomeDashboardGlassCard extends HTMLElement {
    #config?: GlassConfig;
    #hass?: LovelaceHass;
    #store?: HaStore;
    #root?: Root;
    #mount?: HTMLDivElement;
    #items?: { key: unknown[]; items: GlassItem[] };

    /** Lovelace calls this on every YAML edit; a throw shows the problems in the editor. */
    setConfig(raw: unknown) {
      this.#config = parseGlassConfig(raw);
      this.#items = undefined;
      this.#render();
    }

    set hass(hass: LovelaceHass) {
      const previous = this.#hass;
      this.#hass = hass;
      if (!this.#store || previous?.connection !== hass.connection) {
        this.#store = createHaStore(createHomeAssistantTransport(hass.connection));
      }
      // Entity states reach the cards through the store; only re-render for what the page itself reads.
      if (!previous || previous.connection !== hass.connection || previous.user?.name !== hass.user?.name || this.#itemsStale(hass)) this.#render();
    }

    getCardSize() { return 12; }
    getGridOptions() { return { columns: "full", rows: "auto" }; }

    /** What the card picker pre-fills: automatic, every supported entity by area. */
    static getStubConfig() {
      return { type: `custom:${GLASS_CARD_TYPE}` };
    }

    connectedCallback() {
      if (!this.shadowRoot) {
        const shadow = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = styles;
        this.#mount = document.createElement("div");
        shadow.append(style, this.#mount);
        loadFont();
      }
      this.#render();
    }

    disconnectedCallback() {
      // Lovelace moves cards between parents; only tear down if it stays detached.
      queueMicrotask(() => {
        if (this.isConnected) return;
        this.#root?.unmount();
        this.#root = undefined;
      });
    }

    /** The registries and the set of entities decide the cards and their rooms; a state change does not. */
    #key(hass: LovelaceHass): unknown[] {
      return [this.#config, hass.entities, hass.devices, hass.areas, Object.keys(hass.states).length];
    }

    #itemsStale(hass: LovelaceHass) {
      const key = this.#key(hass);
      return !this.#items || this.#items.key.some((part, i) => part !== key[i]);
    }

    #itemsFor(config: GlassConfig, hass: LovelaceHass): GlassItem[] {
      if (this.#itemsStale(hass)) {
        const input = autoInput(hass);
        const cards = config.cards ?? autoGlassCards(input);
        this.#items = { key: this.#key(hass), items: cards.map((c) => ({ ...c, area: c.area ?? areaName(input, c.entity) })) };
      }
      return this.#items!.items;
    }

    #render() {
      const config = this.#config;
      const hass = this.#hass;
      if (!config || !hass || !this.#store || !this.#mount || !this.isConnected) return;
      this.#root ??= createRoot(this.#mount);
      this.#root.render(
        <ErrorBoundary>
          <HaProvider store={this.#store}>
            <GlassDashboard title={config.title} name={config.name ?? hass.user?.name} items={this.#itemsFor(config, hass)} />
          </HaProvider>
        </ErrorBoundary>,
      );
    }
  };
}

/** Register the element and list it in the Lovelace card picker. Safe to call twice. */
export function defineGlassCard(css: string) {
  if (customElements.get(GLASS_CARD_TYPE)) return;
  customElements.define(GLASS_CARD_TYPE, createGlassCard(css));
  window.customCards ??= [];
  window.customCards.push({
    type: GLASS_CARD_TYPE,
    name: "Home Dashboard Glass",
    description: "The glass dashboard: translucent cards by room. Leave out `cards` to show every light, climate, toggle and weather entity.",
    preview: false,
  });
}

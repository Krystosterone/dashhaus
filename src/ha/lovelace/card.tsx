import { Component } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type { Connection } from "home-assistant-js-websocket";
import { HaProvider } from "../provider";
import { createHaStore } from "../store";
import { createHomeAssistantTransport } from "../home-assistant";
import type { HaStore, HassEntities } from "../types";
import { autoDashboard } from "./auto";
import type { AutoEntityEntry } from "./auto";
import { parseDashboardConfig } from "./config";
import type { BlockConfig, DashboardConfig } from "./config";
import { ConfigDashboard } from "./ConfigDashboard";
import { scopeToHost } from "./styles";

/** The part of the frontend's `hass` object the card reads. Lovelace sets a new one on every change. */
export interface LovelaceHass {
  connection: Connection;
  states: HassEntities;
  entities?: Record<string, AutoEntityEntry>;
  devices?: Record<string, { area_id?: string | null }>;
  areas?: Record<string, { name: string }>;
  themes?: { darkMode?: boolean };
}

export const CARD_TYPE = "home-dashboard";
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700&display=swap";

/** The card fills its view; tokens.css's dashboard surface paints the page behind it. */
const HOST_CSS = `
:host { display: block; height: 100%; }
.ha-surface { min-height: 100%; }
.hd-config-error { margin: 16px; padding: 16px; border-radius: 16px; background: var(--card-solid); color: var(--ink); font: 500 14px/1.5 var(--font); white-space: pre-wrap; }
`;

class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    return this.state.error
      ? <div className="hd-config-error" role="alert">Home Dashboard stopped: {this.state.error.message}</div>
      : this.props.children;
  }
}

const autoInput = (hass: LovelaceHass) => ({ states: hass.states, entities: hass.entities, devices: hass.devices, areas: hass.areas });

/**
 * `type: custom:home-dashboard` — a whole dashboard page in one Lovelace card. Lovelace gives it the
 * config and a live `hass`; it reuses the frontend's own websocket connection, so it needs no token.
 */
export function createHomeDashboardCard(css: string) {
  const styles = scopeToHost(css) + HOST_CSS;

  return class HomeDashboardCard extends HTMLElement {
    #config?: DashboardConfig;
    #hass?: LovelaceHass;
    #store?: HaStore;
    #root?: Root;
    #mount?: HTMLDivElement;
    #auto?: { key: unknown[]; blocks: BlockConfig[] };

    /** Lovelace calls this on every YAML edit; a throw shows the problems in the editor. */
    setConfig(raw: unknown) {
      this.#config = parseDashboardConfig(raw);
      this.#auto = undefined;
      this.#render();
    }

    set hass(hass: LovelaceHass) {
      const previous = this.#hass;
      this.#hass = hass;
      if (!this.#store || previous?.connection !== hass.connection) {
        this.#store = createHaStore(createHomeAssistantTransport(hass.connection));
      }
      // Entity states reach the tiles through the store; only re-render for what the page itself reads.
      if (
        !previous
        || previous.connection !== hass.connection
        || previous.themes?.darkMode !== hass.themes?.darkMode
        || (!this.#config?.blocks && this.#autoStale(hass))
      ) this.#render();
    }

    getCardSize() { return 12; }
    getGridOptions() { return { columns: "full", rows: "auto" }; }

    /** What the card picker pre-fills: the automatic layout spelled out, ready to edit. */
    static getStubConfig(hass: LovelaceHass) {
      return autoDashboard(autoInput(hass));
    }

    connectedCallback() {
      if (!this.shadowRoot) {
        const shadow = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = styles;
        this.#mount = document.createElement("div");
        this.#mount.className = "ha-surface";
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

    #render() {
      const config = this.#config;
      const hass = this.#hass;
      if (!config || !hass || !this.#store || !this.#mount || !this.isConnected) return;

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

      this.#root ??= createRoot(this.#mount);
      this.#root.render(
        <ErrorBoundary>
          <HaProvider store={this.#store}>
            <ConfigDashboard config={{ ...config, blocks: this.#blocks(config, hass) }} />
          </HaProvider>
        </ErrorBoundary>,
      );
    }
  };
}

/** Fonts only load from the document, never from inside a shadow root. */
function loadFont() {
  if (document.head.querySelector(`link[href="${FONT_HREF}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONT_HREF;
  document.head.append(link);
}

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string; preview?: boolean; documentationURL?: string }>;
  }
}

/** Register the element and list it in the Lovelace card picker. Safe to call twice. */
export function defineHomeDashboardCard(css: string) {
  if (customElements.get(CARD_TYPE)) return;
  customElements.define(CARD_TYPE, createHomeDashboardCard(css));
  window.customCards ??= [];
  window.customCards.push({
    type: CARD_TYPE,
    name: "Home Dashboard",
    description: "A whole dashboard page from one YAML card. Leave out `sections` to lay the house out automatically.",
    preview: false,
  });
}

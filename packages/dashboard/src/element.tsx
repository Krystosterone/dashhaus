import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type { Connection } from "@dashhaus/core/websocket";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createHomeAssistantTransport } from "@dashhaus/core/websocket";
import type { HaStore, HassEntities } from "@dashhaus/core";
import { perfMark, perfMarkAfterPaint } from "@dashhaus/core/perf";
import { ErrorBoundary } from "./errorBoundary";

/** Registry facts per entity: the shape of the frontend's `hass.entities`. */
export interface AutoEntityEntry {
  device_id?: string | null;
  area_id?: string | null;
  hidden?: boolean;
  /** "config" or "diagnostic" entities are plumbing, never dashboard content. */
  entity_category?: string | null;
}

/** The part of the frontend's `hass` object the cards read. Lovelace sets a new one on every change. */
export interface LovelaceHass {
  connection: Connection;
  states: HassEntities;
  entities?: Record<string, AutoEntityEntry>;
  devices?: Record<string, { area_id?: string | null }>;
  areas?: Record<string, { name: string }>;
  themes?: { darkMode?: boolean };
  /** The frontend's panels by URL path; a nav names the dashboards it goes to from them. */
  panels?: Record<string, { url_path?: string; title?: string | null }>;
}

/** The states and registries an automatic layout reads, from `hass`. */
export const autoInput = (hass: LovelaceHass) => ({ states: hass.states, entities: hass.entities, devices: hass.devices, areas: hass.areas });

/**
 * A web font's stylesheet, linked from the page itself: fonts only load from the document, never from inside a
 * shadow root. Once per page, however many cards ask. Without the network the card keeps its fallback stack.
 */
function loadFont(href: string) {
  if (document.head.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}

/**
 * What every skin's Lovelace card shares, whichever UI it draws: a shadow root with the bundle's styles, one store per
 * frontend connection (reused, never closed, so no token), and a React root that survives Lovelace moving the
 * card between parents. A Lovelace card parses its YAML, says which `hass` changes its page reads (entity states reach it
 * through the store either way), and draws.
 */
export abstract class LovelaceDashboardElement<C> extends HTMLElement {
  /** The bundle's stylesheet, scoped to the host, plus the card's own host rules. */
  protected abstract readonly styles: string;
  /** A class for the element React renders into. */
  protected readonly mountClass: string = "";
  /** The skin's web font, as a stylesheet URL (Google Fonts); none keeps the skin's fallback stack. */
  protected readonly fontHref?: string;
  protected config?: C;
  #hass?: LovelaceHass;
  #store?: HaStore;
  #root?: Root;
  #mount?: HTMLDivElement;

  /** Check and normalize the YAML; a throw shows the problems in the editor. */
  protected abstract parse(raw: unknown): C;
  /** Whether a new `hass` changes what the page itself shows. */
  protected abstract changed(previous: LovelaceHass, next: LovelaceHass): boolean;
  protected abstract draw(config: C, hass: LovelaceHass): ReactNode;
  /** Host attributes the page reads, set before each draw. */
  protected paintHost(_config: C, _hass: LovelaceHass) {}

  /** Lovelace calls this on every YAML edit. */
  setConfig(raw: unknown) {
    this.config = this.parse(raw);
    perfMark("config:parsed");
    this.render();
  }

  set hass(hass: LovelaceHass) {
    const previous = this.#hass;
    this.#hass = hass;
    if (!previous) perfMark("hass:ready");
    if (!this.#store || previous?.connection !== hass.connection) {
      // Home Assistant already holds the house's states; seed the store so the first frame has data instead
      // of placeholders while the store's own subscription answers.
      this.#store = createHaStore(createHomeAssistantTransport(hass.connection), hass.states);
      perfMark("store:created");
    }
    if (!previous || previous.connection !== hass.connection || this.changed(previous, hass)) this.render();
  }

  getCardSize() { return 12; }
  getGridOptions() { return { columns: "full", rows: "auto" }; }

  connectedCallback() {
    perfMark("element:connected", { first: !this.shadowRoot });
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = this.styles;
      this.#mount = document.createElement("div");
      if (this.mountClass) this.#mount.className = this.mountClass;
      shadow.append(style, this.#mount);
      if (this.fontHref) loadFont(this.fontHref);
    }
    this.render();
  }

  disconnectedCallback() {
    // Lovelace moves cards between parents; only tear down if it stays detached.
    queueMicrotask(() => {
      if (this.isConnected) return;
      this.#root?.unmount();
      this.#root = undefined;
    });
  }

  protected render() {
    const config = this.config;
    const hass = this.#hass;
    if (!config || !hass || !this.#store || !this.#mount || !this.isConnected) return;
    const first = !this.#root;
    perfMark("render:start", { first });
    this.paintHost(config, hass);
    // Connect before the first frame so a host snapshot is in the first render, not behind an effect that
    // runs after it; HaProvider's own acquire then finds the store already connected.
    if (first) void this.#store.connect().catch(() => undefined);
    this.#root ??= createRoot(this.#mount);
    this.#root.render(
      <ErrorBoundary config={config}>
        <HaProvider store={this.#store}>{this.draw(config, hass)}</HaProvider>
      </ErrorBoundary>,
    );
    // The first render is the page's load; later renders come from an interaction and are covered by marks there.
    if (first) perfMarkAfterPaint("render:painted", { first });
  }
}

declare global {
  interface Window {
    customCards?: Array<{ type: string; name: string; description: string; preview?: boolean; documentationURL?: string }>;
  }
}

/** Register a card's element and list it in the Lovelace card picker. Safe to call twice. */
export function registerCard(type: string, element: CustomElementConstructor, name: string, description: string) {
  if (customElements.get(type)) return;
  customElements.define(type, element);
  window.customCards ??= [];
  window.customCards.push({ type, name, description, preview: false });
}

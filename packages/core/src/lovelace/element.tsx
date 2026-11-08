import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type { Connection } from "../websocket";
import { HaProvider } from "../index";
import { createHaStore } from "../index";
import { createHomeAssistantTransport } from "../websocket";
import type { HaStore, HassEntities } from "../index";
import { perfMark, perfMarkAfterPaint } from "../perf";
import { ErrorBoundary } from "./errorBoundary";
import { readEnergyPrefs } from "../index";
import type { EnergyPrefs } from "../index";

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

/**
 * The states and registries an automatic layout reads, from `hass`, and the house's energy preferences where the skin
 * has them (`LovelaceDashboardElement.energyPrefs`).
 */
export const autoInput = (hass: LovelaceHass, energy?: EnergyPrefs) =>
  ({ states: hass.states, entities: hass.entities, devices: hass.devices, areas: hass.areas, ...(energy && { energy }) });

/** One connection's read of the energy preferences: its answer once it lands. */
interface EnergyRead {
  settled: boolean;
  prefs?: EnergyPrefs;
  done: Promise<void>;
}

/**
 * The energy preferences, read once per frontend connection and shared by every card on it; a new connection (a
 * reconnect, another frontend) reads them again. They rarely change, so a change shows on the next load.
 */
const energyReads = new WeakMap<Connection, EnergyRead>();

function readEnergy(connection: Connection): EnergyRead {
  const held = energyReads.get(connection);
  if (held) return held;
  const read: EnergyRead = { settled: false, done: Promise.resolve() };
  read.done = readEnergyPrefs((message) => connection.sendMessagePromise(message)).then((prefs) => {
    read.prefs = prefs;
    read.settled = true;
  });
  energyReads.set(connection, read);
  return read;
}

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
 * What every skin's Lovelace card shares, whichever UI it draws: a shadow root with the resource's styles, one store
 * per frontend connection (reused, never closed, so no token), and a React root that survives Lovelace moving the card
 * between parents. A Lovelace card parses its YAML, says which `hass` changes its page reads (entity states reach it
 * through the store either way), and draws.
 */
export abstract class LovelaceDashboardElement<C> extends HTMLElement {
  /** The resource's stylesheet, scoped to the host, plus the card's own host rules. */
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
  /**
   * Home Assistant's own dialog for an entity (more-info: a camera's live stream, with the frontend's player). The
   * event leaves the shadow root and bubbles to the frontend, which opens it.
   */
  readonly #moreInfo = (entityId: string) => {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  };

  /** Check and normalize the YAML; a throw shows the problems in the editor. */
  protected abstract parse(raw: unknown): C;
  /** Whether a new `hass` changes what the page itself shows. */
  protected abstract changed(previous: LovelaceHass, next: LovelaceHass): boolean;
  protected abstract draw(config: C, hass: LovelaceHass): ReactNode;
  /** Host attributes the page reads, set before each draw. */
  protected paintHost(_config: C, _hass: LovelaceHass) {}

  /** The connection whose energy read this card waits on, to draw again when it lands. */
  #energyWait?: Connection;

  /**
   * Home Assistant's energy preferences (`energy/get_prefs`), for an automatic layout's power and energy meters:
   * nothing until they land, when the card draws again, and nothing for good when the house has none or the read
   * fails. The read starts the first time a skin asks, so a skin asks only on its automatic path and a page laid out
   * by hand never sends it; it is made once per connection, whatever number of cards ask.
   */
  protected energyPrefs(hass: LovelaceHass): EnergyPrefs | undefined {
    const read = readEnergy(hass.connection);
    if (!read.settled && this.#energyWait !== hass.connection) {
      this.#energyWait = hass.connection;
      void read.done.then(() => this.render());
    }
    return read.prefs;
  }

  /** What `energyPrefs` already holds for the connection, without reading: for a static `getStubConfig(hass)`. */
  protected static heldEnergyPrefs(hass: LovelaceHass): EnergyPrefs | undefined {
    return energyReads.get(hass.connection)?.prefs;
  }

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
        <HaProvider store={this.#store} moreInfo={this.#moreInfo}>{this.draw(config, hass)}</HaProvider>
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

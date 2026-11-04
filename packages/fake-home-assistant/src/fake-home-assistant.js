/**
 * The in-memory Home Assistant: the house's live states, the deploy log and the commands a websocket client sends.
 *
 * `server.js` serves this same object over Home Assistant's real websocket API. A test can use it directly, without a
 * socket, by calling `send`; `callService` changes the house and tells every `onStateChange` listener.
 */
import { houseRegistries, houseStates } from "./house.js";

const stamp = "2026-10-31T18:00:00Z";
const context = () => ({ id: "fake", parent_id: null, user_id: null });

/** Fill what an injected state may omit, so every compressed websocket event has a timestamp. */
const normalizeState = (state) => ({
  entity_id: state.entity_id,
  state: state.state,
  attributes: { ...state.attributes },
  last_changed: state.last_changed ?? stamp,
  last_updated: state.last_updated ?? state.last_changed ?? stamp,
  context: state.context ?? context(),
});

export class FakeHomeAssistant {
  version = "2026.10.0";
  resources = [];
  dashboards = [];
  saved = [];
  calls = [];
  closed = false;
  failResources = false;
  /** Dashboards ever created, so an id is never reused after a delete. */
  #created = 0;
  /** The house's live states by entity id; `call_service` changes them and tells every `onStateChange` listener. */
  states;
  /** The registries the frontend's `hass` carries; `states` and these may be replaced at construction. */
  registries;
  stateListeners = new Set();

  constructor({ states = houseStates(), registries = houseRegistries() } = {}) {
    this.states = Object.fromEntries(states.map((state) => [state.entity_id, normalizeState(state)]));
    this.registries = {
      entities: registries.entities ?? {},
      devices: registries.devices ?? {},
      areas: registries.areas ?? {},
    };
  }

  onStateChange(listener) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /** The entity registry as `config/entity_registry/list_for_display` returns it. */
  entityRegistryForDisplay() {
    return {
      entity_categories: {},
      entities: Object.values(this.registries.entities).map((entry) => ({
        ei: entry.entity_id,
        ...(entry.area_id ? { ai: entry.area_id } : {}),
        ...(entry.device_id ? { di: entry.device_id } : {}),
      })),
    };
  }

  /** The device registry as `config/device_registry/list` returns it. */
  deviceRegistry() {
    return Object.values(this.registries.devices);
  }

  /** The area registry as `config/area_registry/list` returns it. */
  areaRegistry() {
    return Object.values(this.registries.areas);
  }

  /**
   * `light`/`switch`/`input_boolean` turn_on, turn_off and toggle, a light's brightness, and a lock's lock, unlock and
   * open; anything else is accepted unchanged.
   */
  callService({ domain, service, service_data: data = {}, target = {} }) {
    const ids = [].concat(target.entity_id ?? data.entity_id ?? []);
    for (const id of ids) {
      const state = this.states[id];
      if (!state) throw new Error(`Entity ${id} not found`);
      const LOCK = { lock: "locked", unlock: "unlocked", open: "open" };
      const next = service === "turn_on" ? "on" : service === "turn_off" ? "off" : service === "toggle" ? (state.state === "on" ? "off" : "on")
        : domain === "lock" && service in LOCK ? LOCK[service] : state.state;
      const attributes = { ...state.attributes };
      if (domain === "light") {
        if (data.brightness_pct != null) attributes.brightness = Math.round(data.brightness_pct * 2.55);
        else if (data.brightness != null) attributes.brightness = data.brightness;
        if (next === "off") attributes.brightness = null;
        else if (attributes.brightness == null && "brightness" in attributes) attributes.brightness = 255;
      }
      const now = new Date().toISOString();
      this.states[id] = { ...state, state: next, attributes, last_changed: next === state.state ? state.last_changed : now, last_updated: now };
      for (const listener of this.stateListeners) listener(this.states[id]);
    }
    return { context: context() };
  }

  async send(type, payload = {}) {
    this.calls.push({ type, payload });
    if (type === "lovelace/resources") {
      if (this.failResources) throw new Error("resources are YAML");
      return this.resources;
    }
    if (type === "lovelace/resources/create") {
      this.resources.push({ id: `resource-${this.resources.length + 1}`, url: payload.url, type: payload.res_type });
      return null;
    }
    if (type === "lovelace/resources/update") {
      const resource = this.resources.find((candidate) => candidate.id === payload.resource_id);
      if (resource) resource.url = payload.url;
      return null;
    }
    if (type === "lovelace/dashboards/list") return this.dashboards;
    if (type === "lovelace/dashboards/create") {
      if (this.dashboards.some((dashboard) => dashboard.url_path === payload.url_path)) throw new Error(`url_path ${payload.url_path} already exists`);
      const dashboard = {
        id: `dashboard-${++this.#created}`,
        url_path: payload.url_path,
        title: payload.title,
        icon: payload.icon,
      };
      this.dashboards.push(dashboard);
      // Home Assistant answers a create with the new item, its id included.
      return { ...dashboard, mode: payload.mode ?? "storage", require_admin: payload.require_admin ?? false, show_in_sidebar: payload.show_in_sidebar ?? true };
    }
    if (type === "lovelace/dashboards/update") {
      const dashboard = this.dashboards.find((candidate) => candidate.id === payload.dashboard_id);
      if (dashboard) dashboard.title = payload.title;
      return null;
    }
    if (type === "lovelace/dashboards/delete") {
      const dashboard = this.dashboards.find((candidate) => candidate.id === payload.dashboard_id);
      if (!dashboard) throw new Error(`Unable to find dashboard_id ${payload.dashboard_id}`);
      this.dashboards = this.dashboards.filter((candidate) => candidate !== dashboard);
      this.saved = this.saved.filter((entry) => entry.url_path !== dashboard.url_path);
      return null;
    }
    if (type === "lovelace/config/save") {
      this.saved = this.saved.filter((entry) => entry.url_path !== payload.url_path);
      this.saved.push({ url_path: payload.url_path, config: payload.config });
      return null;
    }
    if (type === "lovelace/config") {
      const saved = this.saved.find((entry) => entry.url_path === payload.url_path);
      if (!saved) throw new Error("config_not_found");
      return saved.config;
    }
    if (type === "get_states") return Object.values(this.states);
    if (type === "call_service") return this.callService(payload);
    if (type === "config/entity_registry/list_for_display") return this.entityRegistryForDisplay();
    if (type === "config/device_registry/list") return this.deviceRegistry();
    if (type === "config/area_registry/list") return this.areaRegistry();
    throw new Error(`unexpected Home Assistant command ${type}`);
  }

  close() {
    this.closed = true;
  }
}

/** The `connect` callback a driver injects; it records the URL and token and returns the fake. */
export function connectTo(ha, seen = {}) {
  return async (url, token) => {
    seen.url = url;
    seen.token = token;
    return ha;
  };
}

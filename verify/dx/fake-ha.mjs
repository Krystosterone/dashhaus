/**
 * The in-memory Home Assistant the DX drivers deploy into: the same shape as the fake in
 * `packages/deploy/src/deploy.test.ts`, kept here so both clean-room apps use one fake and no network.
 * `fake-ha-server.mjs` serves this same object over Home Assistant's real websocket API, for an agent run.
 *
 * It records every websocket command, the resource it registered, the dashboards it created and each saved layout.
 */

const stamp = "2026-10-31T18:00:00Z";

/** A small house: four areas, lights, room sensors, a switch, a thermostat and the weather. */
export const HOUSE_AREAS = [
  { area_id: "kitchen", name: "Kitchen" },
  { area_id: "living_room", name: "Living room" },
  { area_id: "bedroom", name: "Bedroom" },
  { area_id: "office", name: "Office" },
];

const entity = (entity_id, state, attributes, area_id) => ({ entity_id, state, attributes, area_id });

const HOUSE = [
  entity("light.kitchen_ceiling", "on", { friendly_name: "Kitchen ceiling", supported_color_modes: ["brightness"], color_mode: "brightness", brightness: 230 }, "kitchen"),
  entity("light.kitchen_counter", "off", { friendly_name: "Counter strip", supported_color_modes: ["brightness"], color_mode: null, brightness: null }, "kitchen"),
  entity("sensor.kitchen_temperature", "21.8", { friendly_name: "Kitchen temperature", device_class: "temperature", unit_of_measurement: "°C", state_class: "measurement" }, "kitchen"),
  entity("sensor.kitchen_humidity", "47", { friendly_name: "Kitchen humidity", device_class: "humidity", unit_of_measurement: "%", state_class: "measurement" }, "kitchen"),
  entity("light.living_room_floor", "on", { friendly_name: "Floor lamp", supported_color_modes: ["color_temp"], color_mode: "color_temp", brightness: 140, color_temp_kelvin: 2700, min_color_temp_kelvin: 2200, max_color_temp_kelvin: 6500 }, "living_room"),
  entity("light.living_room_shelf", "off", { friendly_name: "Shelf lights", supported_color_modes: ["onoff"], color_mode: null }, "living_room"),
  entity("sensor.living_room_temperature", "20.6", { friendly_name: "Living room temperature", device_class: "temperature", unit_of_measurement: "°C", state_class: "measurement" }, "living_room"),
  entity("climate.living_room", "heat", { friendly_name: "Thermostat", hvac_modes: ["off", "heat"], hvac_action: "heating", current_temperature: 20.6, temperature: 21.5, min_temp: 7, max_temp: 30, target_temp_step: 0.5 }, "living_room"),
  entity("light.bedroom_bedside", "off", { friendly_name: "Bedside", supported_color_modes: ["brightness"], color_mode: null, brightness: null }, "bedroom"),
  entity("sensor.bedroom_temperature", "19.2", { friendly_name: "Bedroom temperature", device_class: "temperature", unit_of_measurement: "°C", state_class: "measurement" }, "bedroom"),
  entity("sensor.bedroom_humidity", "52", { friendly_name: "Bedroom humidity", device_class: "humidity", unit_of_measurement: "%", state_class: "measurement" }, "bedroom"),
  entity("light.office_desk", "on", { friendly_name: "Desk lamp", supported_color_modes: ["brightness"], color_mode: "brightness", brightness: 180 }, "office"),
  entity("sensor.office_temperature", "unavailable", { friendly_name: "Office temperature", device_class: "temperature", unit_of_measurement: "°C" }, "office"),
  entity("switch.office_fan", "off", { friendly_name: "Desk fan" }, "office"),
  entity("weather.home", "partlycloudy", { friendly_name: "Home", temperature: 9, humidity: 71, wind_speed: 14, temperature_unit: "°C", wind_speed_unit: "km/h" }, null),
];

/** A room's sensors sit on one device, as a climate sensor's do in Home Assistant, so layouts can pair them. */
const deviceOf = ({ entity_id, area_id }) => (entity_id.startsWith("sensor.") && area_id ? `${area_id}_air` : null);

/** The house as `get_states` returns it. */
export function houseStates() {
  return HOUSE.map(({ entity_id, state, attributes }) => ({
    entity_id,
    state,
    attributes: { ...attributes },
    last_changed: stamp,
    last_updated: stamp,
    context: { id: "fake", parent_id: null, user_id: null },
  }));
}

/** The entity registry as `config/entity_registry/list_for_display` returns it. */
export function houseEntityRegistry() {
  return {
    entity_categories: {},
    entities: HOUSE.map((entry) => ({ ei: entry.entity_id, ...(entry.area_id ? { ai: entry.area_id } : {}), ...(deviceOf(entry) ? { di: deviceOf(entry) } : {}) })),
  };
}

/** The device registry as `config/device_registry/list` returns it. */
export function houseDevices() {
  const devices = new Map(HOUSE.filter(deviceOf).map((entry) => [deviceOf(entry), entry.area_id]));
  return [...devices].map(([id, area_id]) => ({ id, area_id, name: id.replaceAll("_", " ") }));
}

/** The registries as the frontend's `hass` carries them. */
export function houseRegistries() {
  return {
    entities: Object.fromEntries(HOUSE.map((entry) => [entry.entity_id, { entity_id: entry.entity_id, area_id: entry.area_id, device_id: deviceOf(entry), hidden: false, entity_category: null }])),
    devices: Object.fromEntries(houseDevices().map((device) => [device.id, device])),
    areas: Object.fromEntries(HOUSE_AREAS.map((area) => [area.area_id, area])),
  };
}

export class FakeHomeAssistant {
  version = "2026.10.0";
  resources = [];
  dashboards = [];
  saved = [];
  calls = [];
  closed = false;
  failResources = false;
  /** The house's live states by entity id; `call_service` changes them and tells every `onStateChange` listener. */
  states = Object.fromEntries(houseStates().map((state) => [state.entity_id, state]));
  stateListeners = new Set();

  onStateChange(listener) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /** `light`/`switch`/`input_boolean` turn_on, turn_off and toggle, and a light's brightness; anything else is accepted unchanged. */
  callService({ domain, service, service_data: data = {}, target = {} }) {
    const ids = [].concat(target.entity_id ?? data.entity_id ?? []);
    for (const id of ids) {
      const state = this.states[id];
      if (!state) throw new Error(`Entity ${id} not found`);
      const next = service === "turn_on" ? "on" : service === "turn_off" ? "off" : service === "toggle" ? (state.state === "on" ? "off" : "on") : state.state;
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
    return { context: { id: "fake", parent_id: null, user_id: null } };
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
      this.dashboards.push({
        id: `dashboard-${this.dashboards.length + 1}`,
        url_path: payload.url_path,
        title: payload.title,
        icon: payload.icon,
      });
      return null;
    }
    if (type === "lovelace/dashboards/update") {
      const dashboard = this.dashboards.find((candidate) => candidate.id === payload.dashboard_id);
      if (dashboard) dashboard.title = payload.title;
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
    if (type === "config/entity_registry/list_for_display") return houseEntityRegistry();
    if (type === "config/device_registry/list") return houseDevices();
    if (type === "config/area_registry/list") return HOUSE_AREAS;
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

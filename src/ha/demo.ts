import type { HaServiceCallOptions, HaTransport, HassEntity, HassEntities } from "./types";

const stamp = "2026-10-19T11:20:00Z";
const initial: HassEntities = {
  "light.living_room": {
    entity_id: "light.living_room",
    state: "on",
    attributes: {
      friendly_name: "Living room",
      supported_color_modes: ["color_temp", "brightness"],
      brightness: 196,
      color_temp_kelvin: 3000,
      min_color_temp_kelvin: 2000,
      max_color_temp_kelvin: 5000,
    },
    last_changed: stamp,
    last_updated: stamp,
  },
};

const climateInitial: HassEntities = {
  "climate.living_room": {
    entity_id: "climate.living_room",
    state: "heat",
    attributes: {
      friendly_name: "Thermostat",
      hvac_modes: ["off", "heat", "cool", "heat_cool"],
      hvac_action: "heating",
      current_temperature: 20.4,
      current_humidity: 41,
      temperature: 21.5,
      min_temp: 7,
      max_temp: 30,
      target_temp_step: 0.5,
      temperature_unit: "°C",
      preset_mode: "home",
      preset_modes: ["home", "away", "sleep"],
      fan_mode: "auto",
      fan_modes: ["auto", "low", "high"],
    },
    last_changed: stamp,
    last_updated: stamp,
  },
};

const sensorInitial: HassEntities = {
  "sensor.living_room_temperature": {
    entity_id: "sensor.living_room_temperature",
    state: "21.4",
    attributes: {
      friendly_name: "Living room",
      device_class: "temperature",
      unit_of_measurement: "°C",
    },
    last_changed: stamp,
    last_updated: stamp,
  },
  "sensor.living_room_humidity": {
    entity_id: "sensor.living_room_humidity",
    state: "44",
    attributes: {
      friendly_name: "Living room humidity",
      device_class: "humidity",
      unit_of_measurement: "%",
    },
    last_changed: stamp,
    last_updated: stamp,
  },
  "sensor.living_room_battery": {
    entity_id: "sensor.living_room_battery",
    state: "82",
    attributes: {
      friendly_name: "Living room battery",
      device_class: "battery",
      unit_of_measurement: "%",
    },
    last_changed: stamp,
    last_updated: stamp,
  },
};

const weatherInitial: HassEntities = {
  "weather.home": {
    entity_id: "weather.home",
    state: "partlycloudy",
    attributes: {
      friendly_name: "Home",
      temperature: 21.5,
      apparent_temperature: 20.8,
      dew_point: 12.2,
      humidity: 58,
      pressure: 1012,
      wind_speed: 14,
      wind_gust_speed: 23,
      wind_bearing: 225,
      uv_index: 3,
      temperature_unit: "°C",
      wind_speed_unit: "km/h",
      pressure_unit: "hPa",
    },
    last_changed: stamp,
    last_updated: stamp,
  },
  "sensor.home_aqi": {
    entity_id: "sensor.home_aqi",
    state: "42",
    attributes: { friendly_name: "Air quality", device_class: "aqi", unit_of_measurement: "AQI" },
    last_changed: stamp,
    last_updated: stamp,
  },
  "sun.sun": {
    entity_id: "sun.sun",
    state: "above_horizon",
    attributes: { friendly_name: "Sun" },
    last_changed: stamp,
    last_updated: stamp,
  },
};

const weatherForecasts = {
  hourly: [
    { datetime: "2026-10-20T11:00:00Z", condition: "partlycloudy", temperature: 21, precipitation_probability: 10 },
    { datetime: "2026-10-20T12:00:00Z", condition: "sunny", temperature: 23, precipitation_probability: 5 },
    { datetime: "2026-10-20T13:00:00Z", condition: "cloudy", temperature: 22, precipitation_probability: 15 },
  ],
  daily: [
    { datetime: "2026-10-20T00:00:00Z", condition: "sunny", temperature: 23, templow: 12, precipitation_probability: 10 },
    { datetime: "2026-10-21T00:00:00Z", condition: "cloudy", temperature: 19, templow: 10, precipitation_probability: 30 },
  ],
};

/** Storybook-only transport that exercises the real store, mapper, and action path without a server. */
export function createDemoHaTransport(seed: HassEntities = initial): HaTransport {
  let entities = clone(seed);
  const listeners = new Set<(next: HassEntities) => void>();
  const publish = () => listeners.forEach((listener) => listener({ ...entities }));

  return {
    subscribeEntities(listener) {
      listeners.add(listener);
      queueMicrotask(() => listener({ ...entities }));
      return () => { listeners.delete(listener); };
    },
    async callService(domain, service, serviceData = {}, options: HaServiceCallOptions = {}) {
      if (domain === "weather") {
        const entityId = options.target?.entity_id;
        const type = serviceData.type === "hourly" || serviceData.type === "daily" ? serviceData.type : "daily";
        if (service !== "get_forecasts" || typeof entityId !== "string" || !entities[entityId]) throw new Error("Demo weather target not found");
        return { response: { [entityId]: { forecast: weatherForecasts[type] } } };
      }
      if (domain !== "light" && domain !== "climate" && domain !== "input_boolean" && domain !== "switch" && domain !== "humidifier") throw new Error(`Unsupported demo domain: ${domain}`);
      const entityId = serviceData.entity_id;
      if (typeof entityId !== "string" || !entities[entityId]) throw new Error("Demo entity not found");
      const current = entities[entityId];
      const next: HassEntity = { ...current, attributes: { ...current.attributes }, last_updated: new Date().toISOString() };
      if (domain === "input_boolean" || domain === "switch") {
        if (service === "toggle") next.state = current.state === "on" ? "off" : "on";
        if (service === "turn_on" || service === "turn_off") next.state = service === "turn_on" ? "on" : "off";
        next.last_changed = next.last_updated;
      } else if (domain === "humidifier") {
        if (service === "toggle") next.state = current.state === "on" ? "off" : "on";
        if (service === "set_humidity" && typeof serviceData.humidity === "number") next.attributes.humidity = serviceData.humidity;
        if (service === "set_mode" && typeof serviceData.mode === "string") next.attributes.mode = serviceData.mode;
        next.attributes.action = next.state === "on" ? "humidifying" : "off";
        if (next.state !== current.state) next.last_changed = next.last_updated;
      } else if (domain === "light") {
        if (service === "toggle") next.state = current.state === "on" ? "off" : "on";
        if (service === "turn_on") {
          next.state = "on";
          if (typeof serviceData.brightness_pct === "number") next.attributes.brightness = Math.round(serviceData.brightness_pct * 2.55);
          // As a real lamp reports it: a colour temperature or a colour, by its color_mode.
          if (typeof serviceData.color_temp_kelvin === "number") {
            next.attributes.color_temp_kelvin = serviceData.color_temp_kelvin;
            next.attributes.color_mode = "color_temp";
          }
          if (Array.isArray(serviceData.hs_color)) {
            next.attributes.hs_color = serviceData.hs_color;
            next.attributes.color_mode = "hs";
          }
        }
      } else {
        const hvacModes = Array.isArray(current.attributes.hvac_modes) ? current.attributes.hvac_modes : [];
        if (service === "turn_on") next.state = typeof hvacModes.find((mode): mode is string => typeof mode === "string" && mode !== "off") === "string"
          ? hvacModes.find((mode): mode is string => typeof mode === "string" && mode !== "off")!
          : "heat";
        if (service === "turn_off") {
          next.state = "off";
          next.attributes.hvac_action = "off";
        }
        if (service === "set_hvac_mode" && typeof serviceData.hvac_mode === "string") next.state = serviceData.hvac_mode;
        if (service === "set_temperature") {
          if (typeof serviceData.temperature === "number") next.attributes.temperature = serviceData.temperature;
          if (typeof serviceData.target_temp_low === "number") next.attributes.target_temp_low = serviceData.target_temp_low;
          if (typeof serviceData.target_temp_high === "number") next.attributes.target_temp_high = serviceData.target_temp_high;
        }
        if (service === "set_preset_mode" && typeof serviceData.preset_mode === "string") next.attributes.preset_mode = serviceData.preset_mode;
        if (service === "set_fan_mode" && typeof serviceData.fan_mode === "string") next.attributes.fan_mode = serviceData.fan_mode;
        next.attributes.hvac_action = next.state === "off" ? "off" : "idle";
      }
      entities = { ...entities, [entityId]: next };
      publish();
      return { success: true };
    },
    sendMessage: (type, payload = {}) => demoSendMessage(entities, type, payload),
  };
}

/** Storybook-only climate transport using the same store and service path as a host transport. */
export function createDemoClimateHaTransport(seed: HassEntities = climateInitial): HaTransport {
  return createDemoHaTransport(seed);
}

/** Storybook-only sensor transport using the same shared store path as a host transport. */
export function createDemoSensorHaTransport(seed: HassEntities = sensorInitial): HaTransport {
  return createDemoHaTransport(seed);
}

/** Storybook-only weather transport using the same shared store, mapper, and forecast service path as a host transport. */
export function createDemoWeatherHaTransport(seed: HassEntities = weatherInitial): HaTransport {
  return createDemoHaTransport(seed);
}

function clone(entities: HassEntities): HassEntities {
  return Object.fromEntries(Object.entries(entities).map(([id, entity]) => [id, {
    ...entity,
    attributes: { ...entity.attributes },
  }]));
}

/** One compressed `history/history_during_period` row: state, attributes, last-updated epoch seconds. */
export interface DemoHistoryRow {
  s: string;
  a: Record<string, unknown>;
  lu: number;
}

/** Every seeded demo entity resolves to this one area, so `useHaArea` has a name to show. */
export const DEMO_AREA_ID = "living_room";
export const DEMO_AREA_NAME = "Living room";

export function demoAreaRegistry(): Array<{ area_id: string; name: string }> {
  return [{ area_id: DEMO_AREA_ID, name: DEMO_AREA_NAME }];
}

export const DEMO_DEVICE_ID = "demo_device";

/** `config/entity_registry/list_for_display`: every demo entity inherits its area from one device. */
export function demoEntityRegistry(entities: HassEntities) {
  return { entity_categories: {}, entities: Object.keys(entities).map((ei) => ({ ei, di: DEMO_DEVICE_ID, pl: "demo" })) };
}

export function demoDeviceRegistry(): Array<{ id: string; area_id: string }> {
  return [{ id: DEMO_DEVICE_ID, area_id: DEMO_AREA_ID }];
}

/** Today's local date at a fixed morning hour, in epoch seconds. */
function morningEpoch(hour: number, minute = 0): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).getTime() / 1000;
}

function historyRecord(entity: HassEntity, state: string, when: number, attributes: Record<string, unknown> = {}): DemoHistoryRow {
  return { s: state, a: { ...entity.attributes, ...attributes }, lu: when };
}

/** A small realistic day of 2-3 transitions spread across the local morning, per domain. */
function synthesizeHistory(entity: HassEntity): DemoHistoryRow[] {
  const domain = entity.entity_id.slice(0, entity.entity_id.indexOf("."));
  if (domain === "light") {
    return [
      historyRecord(entity, "off", morningEpoch(6, 30)),
      historyRecord(entity, "on", morningEpoch(8), { brightness: entity.attributes.brightness }),
      historyRecord(entity, "on", morningEpoch(9, 30), { brightness: 96 }),
    ];
  }
  if (domain === "cover") {
    return [
      historyRecord(entity, "closed", morningEpoch(6, 30), { current_position: 0 }),
      historyRecord(entity, "opening", morningEpoch(8), { current_position: 45 }),
      historyRecord(entity, "open", morningEpoch(9, 30), { current_position: 100 }),
    ];
  }
  if (domain === "climate") {
    return [
      historyRecord(entity, "heat", morningEpoch(6), { hvac_action: "heating" }),
      historyRecord(entity, "heat", morningEpoch(8), { hvac_action: "idle" }),
      historyRecord(entity, entity.state, morningEpoch(9, 30), { hvac_action: "heating" }),
    ];
  }
  if (domain === "sensor") {
    const unit = typeof entity.attributes.unit_of_measurement === "string" ? entity.attributes.unit_of_measurement : "";
    return [
      historyRecord(entity, "20.1", morningEpoch(7), { unit_of_measurement: unit }),
      historyRecord(entity, "20.8", morningEpoch(8, 30), { unit_of_measurement: unit }),
      historyRecord(entity, entity.state, morningEpoch(9, 45), { unit_of_measurement: unit }),
    ];
  }
  if (domain === "weather") {
    return [
      historyRecord(entity, "cloudy", morningEpoch(7), { temperature: 18.5 }),
      historyRecord(entity, "partlycloudy", morningEpoch(8, 30), { temperature: 20 }),
      historyRecord(entity, entity.state, morningEpoch(9, 45), { temperature: entity.attributes.temperature }),
    ];
  }
  if (domain === "input_boolean" || domain === "switch" || entity.state === "on" || entity.state === "off") {
    return [
      historyRecord(entity, "off", morningEpoch(6, 30)),
      historyRecord(entity, "on", morningEpoch(8)),
      historyRecord(entity, entity.state, morningEpoch(9, 30)),
    ];
  }
  if (domain === "alarm_control_panel") {
    return [
      historyRecord(entity, "disarmed", morningEpoch(6, 30)),
      historyRecord(entity, "armed_home", morningEpoch(8)),
      historyRecord(entity, entity.state, morningEpoch(9, 30)),
    ];
  }
  return [
    historyRecord(entity, entity.state, morningEpoch(8)),
    historyRecord(entity, entity.state, morningEpoch(9, 30)),
  ];
}

/** Rows keyed by entity id, like `history/history_during_period`; entities without history are left out. */
export function demoHistoryDuringPeriod(entities: HassEntities, entityIds: readonly string[]): Record<string, DemoHistoryRow[]> {
  const result: Record<string, DemoHistoryRow[]> = {};
  for (const id of entityIds) {
    const entity = entities[id];
    if (entity) result[id] = synthesizeHistory(entity);
  }
  return result;
}

/** Handle the generic websocket commands a demo transport supports: history reads and the registries. */
export async function demoSendMessage(
  entities: HassEntities,
  type: string,
  payload: Record<string, unknown> = {},
): Promise<unknown> {
  if (type === "history/history_during_period") {
    const entityIds = payload.entity_ids;
    if (!Array.isArray(entityIds) || !entityIds.every((id) => typeof id === "string")) throw new Error("Demo history entity_ids missing");
    return demoHistoryDuringPeriod(entities, entityIds);
  }
  if (type === "config/entity_registry/list_for_display") return demoEntityRegistry(entities);
  if (type === "config/device_registry/list") return demoDeviceRegistry();
  if (type === "config/area_registry/list") return demoAreaRegistry();
  throw new Error(`Unsupported demo command: ${type}`);
}

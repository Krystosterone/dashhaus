import type { HaTransport, HassEntity, HassEntities } from "./ha/types";
import { ALARM_SERVICES } from "./demo/alarm";
import { COVER_SERVICES } from "./demo/cover";
import { fanServices } from "./demo/fan";
import { HUMIDIFIER_SERVICES } from "./demo/humidifier";
import { VOLUME_SERVICES } from "./demo/sound";
import { createDemoTransport, onOffServices } from "./demo/transport";
import type { DemoCall, DemoChange, DemoService, DemoServices } from "./demo/transport";

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

/** What a light's services do: a level, and a colour temperature or a colour, by its color_mode, as a real lamp reports it. */
const LIGHT_SERVICES: DemoServices = {
  ...onOffServices("light", ["toggle"]),
  "light.turn_on": ({ data }) => {
    const attributes: HassEntity["attributes"] = {};
    if (typeof data.brightness_pct === "number") attributes.brightness = Math.round(data.brightness_pct * 2.55);
    if (typeof data.color_temp_kelvin === "number") Object.assign(attributes, { color_temp_kelvin: data.color_temp_kelvin, color_mode: "color_temp" });
    if (Array.isArray(data.hs_color)) Object.assign(attributes, { hs_color: data.hs_color, color_mode: "hs" });
    return { state: "on", attributes };
  },
};

/** A thermostat's change, with the action it reads back: off while off, else idle. */
const reading = (change: (call: DemoCall) => DemoChange): DemoService => (call) => {
  const { state = call.entity.state, attributes } = change(call);
  return { state, attributes: { ...attributes, hvac_action: state === "off" ? "off" : "idle" } };
};

/** What a thermostat's services do. */
const CLIMATE_SERVICES: DemoServices = {
  "climate.turn_on": reading(({ entity }) => {
    const modes = Array.isArray(entity.attributes.hvac_modes) ? entity.attributes.hvac_modes : [];
    const mode = modes.find((m): m is string => typeof m === "string" && m !== "off");
    return { state: mode ?? "heat" };
  }),
  "climate.turn_off": reading(() => ({ state: "off" })),
  "climate.set_hvac_mode": reading(({ data }) => (typeof data.hvac_mode === "string" ? { state: data.hvac_mode } : {})),
  "climate.set_temperature": reading(({ data }) => ({
    attributes: Object.fromEntries(["temperature", "target_temp_low", "target_temp_high"].filter((key) => typeof data[key] === "number").map((key) => [key, data[key]])),
  })),
  "climate.set_preset_mode": reading(({ data }) => (typeof data.preset_mode === "string" ? { attributes: { preset_mode: data.preset_mode } } : {})),
  "climate.set_fan_mode": reading(({ data }) => (typeof data.fan_mode === "string" ? { attributes: { fan_mode: data.fan_mode } } : {})),
};

/** The weather answers its forecasts, hourly or daily. */
const WEATHER_SERVICES: DemoServices = {
  "weather.get_forecasts": ({ entity, data }) => {
    const type = data.type === "hourly" || data.type === "daily" ? data.type : "daily";
    return { response: { [entity.entity_id]: { forecast: weatherForecasts[type] } } };
  },
};

/**
 * Storybook-only transport that exercises the real store, mapper, and action path without a server: it answers every
 * domain's services, so any entity it is seeded with works.
 */
export function createDemoHaTransport(seed: HassEntities = initial): HaTransport {
  return createDemoTransport({
    seed,
    services: {
      ...LIGHT_SERVICES,
      ...CLIMATE_SERVICES,
      ...WEATHER_SERVICES,
      ...onOffServices("input_boolean"),
      ...onOffServices("switch"),
      ...VOLUME_SERVICES,
      ...COVER_SERVICES,
      ...ALARM_SERVICES,
      ...fanServices(),
      ...HUMIDIFIER_SERVICES,
    },
  });
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

export * from "./demo/messages";

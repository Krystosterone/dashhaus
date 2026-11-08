import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import { fanServices } from "./fan";
import { createDemoTransport, onOffServices } from "./transport";
import type { DemoServices } from "./transport";

const stamp = "2026-10-19T11:20:00Z";
/** `FanEntityFeature`: speed 1, oscillate 2, direction 4, preset 8, turn off 16, turn on 32, as `dyson_local` sets them. */
const FEATURES = 1 | 2 | 4 | 8 | 16 | 32;

const entity = (entity_id: string, state: string, attributes: HassEntity["attributes"]): [string, HassEntity] =>
  [entity_id, { entity_id, state, attributes, last_changed: stamp, last_updated: stamp }];
const sensor = (entity_id: string, state: string, friendly_name: string, attributes: HassEntity["attributes"] = {}) =>
  entity(entity_id, state, { friendly_name, state_class: "measurement", ...attributes });
const ug = { unit_of_measurement: "µg/m³" };
const life = (entity_id: string, state: string, friendly_name: string) =>
  entity(entity_id, state, { friendly_name, unit_of_measurement: "%", icon: "mdi:filter-outline" });

/**
 * Two Dysons as `dyson_local` (ha-dyson) exposes them: a Pure Cool in the bedroom, its sweep from its angles, and a
 * Hot+Cool in the living room with its heater, each with the sensors and the night-mode switch on its device.
 */
const initial: HassEntities = Object.fromEntries([
  entity("fan.bedroom_purifier", "on", {
    friendly_name: "Purifier", percentage: 40, percentage_step: 10, preset_mode: "Normal", preset_modes: ["Auto", "Normal"],
    oscillating: true, direction: "forward", angle_low: 135, angle_high: 225, supported_features: FEATURES,
  }),
  sensor("sensor.bedroom_purifier_pm_2_5", "8", "Purifier PM 2.5", { device_class: "pm25", ...ug }),
  sensor("sensor.bedroom_purifier_pm_10", "12", "Purifier PM 10", { device_class: "pm10", ...ug }),
  sensor("sensor.bedroom_purifier_volatile_organic_compounds_index", "2", "Purifier Volatile Organic Compounds Index", { device_class: "aqi" }),
  sensor("sensor.bedroom_purifier_nitrogen_dioxide_index", "1", "Purifier Nitrogen Dioxide Index", { device_class: "aqi" }),
  sensor("sensor.bedroom_purifier_temperature", "21.4", "Purifier Temperature", { device_class: "temperature", unit_of_measurement: "°C" }),
  sensor("sensor.bedroom_purifier_humidity", "44", "Purifier Humidity", { device_class: "humidity", unit_of_measurement: "%" }),
  life("sensor.bedroom_purifier_hepa_filter_life", "72", "Purifier HEPA Filter Life"),
  life("sensor.bedroom_purifier_carbon_filter_life", "64", "Purifier Carbon Filter Life"),
  entity("switch.bedroom_purifier_night_mode", "off", { friendly_name: "Purifier Night Mode", icon: "mdi:power-sleep" }),

  entity("fan.living_room_hot_cool", "on", {
    friendly_name: "Hot+Cool", percentage: null, percentage_step: 10, preset_mode: "Auto", preset_modes: ["Auto", "Normal"],
    oscillating: false, direction: "forward", angle_low: 90, angle_high: 270, supported_features: FEATURES,
  }),
  sensor("sensor.living_room_hot_cool_pm_2_5", "41", "Hot+Cool PM 2.5", { device_class: "pm25", ...ug }),
  sensor("sensor.living_room_hot_cool_pm_10", "47", "Hot+Cool PM 10", { device_class: "pm10", ...ug }),
  sensor("sensor.living_room_hot_cool_volatile_organic_compounds_index", "3", "Hot+Cool Volatile Organic Compounds Index", { device_class: "aqi" }),
  sensor("sensor.living_room_hot_cool_nitrogen_dioxide_index", "2", "Hot+Cool Nitrogen Dioxide Index", { device_class: "aqi" }),
  sensor("sensor.living_room_hot_cool_hcho", "0.02", "Hot+Cool HCHO", { unit_of_measurement: "mg/m³" }),
  sensor("sensor.living_room_hot_cool_temperature", "19.8", "Hot+Cool Temperature", { device_class: "temperature", unit_of_measurement: "°C" }),
  sensor("sensor.living_room_hot_cool_humidity", "38", "Hot+Cool Humidity", { device_class: "humidity", unit_of_measurement: "%" }),
  life("sensor.living_room_hot_cool_filter_life", "38", "Hot+Cool Filter Life"),
  entity("switch.living_room_hot_cool_night_mode", "off", { friendly_name: "Hot+Cool Night Mode", icon: "mdi:power-sleep" }),
  entity("climate.living_room_hot_cool", "heat", {
    friendly_name: "Hot+Cool", hvac_modes: ["off", "cool", "heat"], hvac_action: "heating", temperature: 23, current_temperature: 19.8,
    current_humidity: 38, min_temp: 1, max_temp: 37, supported_features: 1 | 128 | 256,
  }),
]);

/** The angles a Pure Cool takes: whole degrees, low under high, inside 5-355. */
const angle = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 5 && value <= 355;

/**
 * What `dyson_local`'s entities answer: the fan's services as any fan's, Auto clearing the speed as ha-dyson reports
 * it; `dyson_local.set_angle`, which also starts the sweep; the night-mode switch; the heater's mode and target, its
 * `heat` mode switching the fan on; and a Humidify+Cool's oscillation mode select.
 */
export function dysonServices(): DemoServices {
  const fan = fanServices();
  return {
    ...fan,
    "fan.set_preset_mode": (call) => {
      const change = fan["fan.set_preset_mode"](call);
      return call.data.preset_mode === "Auto" ? { ...change, attributes: { ...("attributes" in change ? change.attributes : {}), percentage: null } } : change;
    },
    "fan.set_percentage": (call) => {
      const change = fan["fan.set_percentage"](call);
      return "attributes" in change && change.state === "on" ? { ...change, attributes: { ...change.attributes, preset_mode: "Normal" } } : change;
    },
    "dyson_local.set_angle": ({ data }) => {
      if (!angle(data.angle_low) || !angle(data.angle_high) || (data.angle_low as number) >= (data.angle_high as number)) throw new Error("angles must be 5-355, low under high");
      return { attributes: { angle_low: data.angle_low, angle_high: data.angle_high, oscillating: true } };
    },
    ...onOffServices("switch", ["turn_on", "turn_off"]),
    "climate.set_hvac_mode": ({ entity, data, also }) => {
      const modes = Array.isArray(entity.attributes.hvac_modes) ? entity.attributes.hvac_modes : [];
      if (typeof data.hvac_mode !== "string" || !modes.includes(data.hvac_mode)) throw new Error("hvac_mode is not one of the heater's modes");
      const fanId = entity.entity_id.replace(/^climate\./, "fan.");
      also(fanId, { state: data.hvac_mode === "off" ? "off" : "on" });
      return { state: data.hvac_mode, attributes: { hvac_action: data.hvac_mode === "heat" ? "heating" : data.hvac_mode === "cool" ? "cooling" : "off" } };
    },
    "climate.set_temperature": ({ entity, data }) => {
      const t = data.temperature;
      const min = Number(entity.attributes.min_temp ?? 1);
      const max = Number(entity.attributes.max_temp ?? 37);
      if (typeof t !== "number" || t < min || t > max) throw new Error(`temperature must be ${min}-${max}`);
      return { attributes: { temperature: t } };
    },
    "select.select_option": ({ entity, data }) => {
      const options = Array.isArray(entity.attributes.options) ? entity.attributes.options : [];
      if (typeof data.option !== "string" || !options.includes(data.option)) throw new Error("option is not one of the select's");
      return { state: data.option };
    },
  };
}

/** Storybook-only Dyson transport: the same store and service path as a host transport, answered locally. */
export function createDemoDysonHaTransport(seed: HassEntities = initial): HaTransport {
  return createDemoTransport({ seed, services: dysonServices() });
}

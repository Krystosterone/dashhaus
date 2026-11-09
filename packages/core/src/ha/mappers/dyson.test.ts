import { describe, expect, it } from "vitest";
import { dysonCompanionIds, dysonFromHass } from "./dyson";
import { dysonFans } from "../../lovelace/layout";
import type { HassEntity } from "../types";
import fixture from "../fixtures/dyson.json";

const at = "2026-10-19T10:00:00Z";
const state = (entity_id: string, value: string, attributes: HassEntity["attributes"] = {}): HassEntity => ({ entity_id, state: value, attributes, last_changed: at, last_updated: at });
const pureCool = fixture["fan.bedroom_purifier"] as HassEntity;
const hotCool = fixture["fan.living_room_hot_cool"] as HassEntity;

describe("dysonCompanionIds", () => {
  it("names each companion as each integration does, after the fan, ha-dyson's first", () => {
    expect(dysonCompanionIds("fan.bedroom")).toMatchObject({
      pm25: ["sensor.bedroom_pm_2_5", "sensor.bedroom_pm2_5"],
      pm10: ["sensor.bedroom_pm_10", "sensor.bedroom_pm10"],
      voc: ["sensor.bedroom_volatile_organic_compounds_index", "sensor.bedroom_voc"],
      no2: ["sensor.bedroom_nitrogen_dioxide_index", "sensor.bedroom_no2"],
      hcho: ["sensor.bedroom_hcho", "sensor.bedroom_formaldehyde"],
      hepaFilter: ["sensor.bedroom_hepa_filter_life"],
      nightMode: ["switch.bedroom_night_mode"],
      heat: ["climate.bedroom"],
      oscillationMode: ["select.bedroom_oscillation_mode", "select.bedroom_oscillation"],
      angleCenter: ["number.bedroom_oscillation_center_angle"],
      angleSpan: ["number.bedroom_oscillation_angle"],
    });
    expect(dysonCompanionIds("sensor.bedroom")).toBeUndefined();
  });

  it("finds a Dyson in an automatic layout by the same names: its night-mode switch and a filter-life sensor", () => {
    const ids = dysonCompanionIds("fan.bedroom")!;
    const s = (...list: string[]) => Object.fromEntries(list.map((id) => [id, { attributes: {} }]));
    expect(dysonFans({ states: s("fan.bedroom", ids.nightMode[0], ids.hepaFilter[0], ids.heat[0]) })).toEqual([{ fan: "fan.bedroom", heat: ids.heat[0] }]);
    expect(dysonFans({ states: s("fan.bedroom", ids.nightMode[0], ids.filter[0]) })).toEqual([{ fan: "fan.bedroom" }]);
    expect(dysonFans({ states: s("fan.bedroom", ids.carbonFilter[0]) })).toEqual([]);
    expect(dysonFans({ states: s("fan.bedroom", ids.nightMode[0]) })).toEqual([]);
  });
});

describe("dysonFromHass", () => {
  it("maps the fan as the fan card does, its presets read as Auto or not", () => {
    expect(dysonFromHass(pureCool, pureCool.entity_id, { area: "Bedroom" })).toMatchObject({
      entityId: "fan.bedroom_purifier", name: "Bedroom Purifier", area: "Bedroom", state: "on",
      supportsSpeed: true, speedCount: 10, percentage: 40, supportsOscillate: true, oscillating: true, supportsDirection: true, direction: "forward",
      supportsAuto: true, auto: false, autoPreset: "Auto", manualPreset: "Normal",
    });
    const mapped = dysonFromHass(hotCool, hotCool.entity_id);
    expect(mapped).toMatchObject({ auto: true, direction: "reverse" });
    expect(mapped.percentage).toBeUndefined();
    expect(mapped).not.toHaveProperty("presetModes");
  });

  it("reads a Pure Cool's sweep from its angles, and none that isn't one of its own", () => {
    expect(dysonFromHass(pureCool, pureCool.entity_id)).toMatchObject({
      oscillationModes: ["45°", "90°", "180°", "350°"], oscillationMode: "90°", oscillationCentre: 180, oscillationBy: "angle",
    });
    const custom = dysonFromHass({ ...pureCool, attributes: { ...pureCool.attributes, angle_low: 100, angle_high: 220 } }, pureCool.entity_id);
    expect(custom.oscillationMode).toBeUndefined();
    expect(custom.oscillationCentre).toBe(160);
    const link = fixture["fan.office_pure_cool_link"] as HassEntity;
    expect(dysonFromHass(link, link.entity_id).oscillationModes).toBeUndefined();
  });

  it("reads a Humidify+Cool's range from its select, which wins over angles", () => {
    const select = state("select.x_oscillation_mode", "Breeze", { options: ["45°", "90°", "Breeze", "Custom"] });
    expect(dysonFromHass(pureCool, pureCool.entity_id, { companions: { oscillationMode: select } })).toMatchObject({
      oscillationModes: ["45°", "90°", "Breeze", "Custom"], oscillationMode: "Breeze", oscillationBy: "select",
    });
  });

  it("composes the device's air readings, in order, a blank one as no reading yet", () => {
    const mapped = dysonFromHass(pureCool, pureCool.entity_id, {
      companions: {
        no2: state("sensor.x_no2", "1"),
        pm25: state("sensor.x_pm25", "62", { unit_of_measurement: "µg/m³" }),
        voc: state("sensor.x_voc", "unknown"),
        hcho: state("sensor.x_hcho", "0.031", { unit_of_measurement: "mg/m³" }),
      },
    });
    expect(mapped.air).toEqual([
      { pollutant: "pm25", value: 62, unit: "µg/m³" },
      { pollutant: "voc", value: null },
      { pollutant: "no2", value: 1 },
      { pollutant: "hcho", value: 0.031, unit: "mg/m³" },
    ]);
  });

  it("reads hass-dyson's angle sliders: its centre and width, their range ahead in the middle", () => {
    const slider = (value: string) => state("number.x", value, { min: 0, max: 350, step: 1, unit_of_measurement: "°" });
    const hass = { ...pureCool, attributes: { ...pureCool.attributes, angle_low: undefined, angle_high: undefined, preset_modes: ["Auto", "Manual"] } };
    const still = dysonFromHass(hass, hass.entity_id, { companions: { angleCenter: slider("233"), angleSpan: slider("0"), angleLow: slider("233"), angleHigh: slider("233") } });
    expect(still).toMatchObject({ oscillationBy: "number", oscillationLow: 233, oscillationHigh: 233, oscillationCentre: 233, angles: { min: 0, max: 350, ahead: 175 }, manualPreset: "Manual" });
    // A named sweep leaves its ends stale, so the width it reports wins over them.
    const sweeping = dysonFromHass(hass, hass.entity_id, { companions: { angleCenter: slider("175"), angleSpan: slider("90"), angleLow: slider("233"), angleHigh: slider("233") } });
    expect(sweeping).toMatchObject({ oscillationLow: 130, oscillationHigh: 220, oscillationMode: "90°" });
    expect(dysonFromHass(hass, hass.entity_id, { companions: { angleCenter: slider("340"), angleSpan: slider("90") } })).toMatchObject({ oscillationLow: 260, oscillationHigh: 350 });
    // Its sliders win over its oscillation select.
    const select = state("select.x_oscillation", "90°", { options: ["45°", "90°", "180°", "350°", "Custom"] });
    expect(dysonFromHass(hass, hass.entity_id, { companions: { angleCenter: slider("175"), angleSpan: slider("90"), oscillationMode: select } }).oscillationBy).toBe("number");
  });

  it("reads hass-dyson's VOC and NO₂ back on Dyson's 0-10 index, and its heater's fan_only as heat off", () => {
    const mapped = dysonFromHass(hotCool, hotCool.entity_id, {
      companions: {
        voc: state("sensor.x_voc", "0.03", { unit_of_measurement: "mg/m³" }),
        no2: state("sensor.x_no2", "40", { unit_of_measurement: "µg/m³" }),
        heat: state("climate.x", "fan_only", { hvac_modes: ["off", "fan_only", "heat"], temperature: 21 }),
      },
    });
    expect(mapped.air).toEqual([{ pollutant: "voc", value: 3 }, { pollutant: "no2", value: 4 }]);
    expect(mapped).toMatchObject({ supportsHeat: true, heatOn: false, heatOffMode: "fan_only" });
  });

  it("reads filters in percent only, and the combined filter's percentage sensor where its life is in hours", () => {
    const pct = { unit_of_measurement: "%" };
    expect(dysonFromHass(pureCool, pureCool.entity_id, { companions: { hepaFilter: state("a", "72", pct), carbonFilter: state("b", "140", pct) } }).filters)
      .toEqual([{ kind: "hepa", percent: 72 }, { kind: "carbon", percent: 100 }]);
    expect(dysonFromHass(pureCool, pureCool.entity_id, { companions: { filter: state("c", "3400", { unit_of_measurement: "h" }), filterPercentage: state("d", "8", pct) } }).filters)
      .toEqual([{ kind: "combined", percent: 8 }]);
  });

  it("reads night mode and the heater, whose cool mode is heat off", () => {
    const heat = state("climate.x", "heat", { hvac_modes: ["off", "cool", "heat"], hvac_action: "heating", temperature: 23, min_temp: 1, max_temp: 37 });
    const temperature = state("sensor.x_temperature", "19.8", { unit_of_measurement: "°C" });
    const mapped = dysonFromHass(hotCool, hotCool.entity_id, { companions: { heat, temperature, humidity: state("h", "38"), nightMode: state("switch.x", "on") } });
    expect(mapped).toMatchObject({
      supportsNightMode: true, nightMode: true, supportsHeat: true, heatOn: true, heating: true, heatTarget: 23, heatMin: 1, heatMax: 37, heatStep: 1, heatUnit: "°C",
      temperature: 19.8, temperatureUnit: "°C", humidity: 38,
    });
    const cooling = dysonFromHass(hotCool, hotCool.entity_id, { companions: { heat: { ...heat, state: "cool", attributes: { ...heat.attributes, hvac_action: "cooling" } } } });
    expect(cooling).toMatchObject({ heatOn: false, heating: false });
    expect(dysonFromHass(hotCool, hotCool.entity_id).supportsHeat).toBe(false);
  });

  it("draws no companion while the fan is unavailable, and keeps unknown and missing unavailable", () => {
    const garage = fixture["fan.garage_purifier"] as HassEntity;
    const mapped = dysonFromHass(garage, garage.entity_id, { companions: { pm25: state("p", "4"), hepaFilter: state("h", "50", { unit_of_measurement: "%" }), nightMode: state("n", "on") } });
    expect(mapped).toMatchObject({ state: "unavailable", air: [], filters: [], supportsNightMode: true });
    expect(mapped.nightMode).toBeUndefined();
    expect(mapped.lastSeen).toBeDefined();
    const porch = fixture["fan.porch_purifier"] as HassEntity;
    expect(dysonFromHass(porch, porch.entity_id).state).toBe("unavailable");
    expect(dysonFromHass(undefined, "fan.missing")).toMatchObject({ entityId: "fan.missing", name: "fan.missing", state: "unavailable", air: [], filters: [] });
  });
});

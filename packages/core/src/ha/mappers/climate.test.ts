import { describe, expect, it } from "vitest";
import { climateFromHass } from "./climate";

const raw = {
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
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:02Z",
};

describe("climateFromHass", () => {
  it("maps HVAC state, readings, limits, capabilities, and timestamps", () => {
    expect(climateFromHass(raw, raw.entity_id, { area: "Living room" })).toMatchObject({
      entityId: "climate.living_room",
      name: "Thermostat",
      area: "Living room",
      state: "heat",
      hvacModes: ["off", "heat", "cool", "heat_cool"],
      hvacAction: "heating",
      currentTemperature: 20.4,
      currentHumidity: 41,
      targetTemperature: 21.5,
      minTemp: 7,
      maxTemp: 30,
      step: 0.5,
      unit: "°C",
      presetMode: "home",
      presetModes: ["home", "away", "sleep"],
      fanMode: "auto",
      fanModes: ["auto", "low", "high"],
    });
    expect(climateFromHass(raw, raw.entity_id).lastChanged).toBeDefined();
  });

  it("maps heat/cool range attributes and Fahrenheit units", () => {
    const mapped = climateFromHass({
      ...raw,
      state: "heat_cool",
      attributes: {
        hvac_modes: ["off", "heat_cool"],
        target_temp_low: 66,
        target_temp_high: 75,
        min_temp: 60,
        max_temp: 86,
        target_temp_step: 1,
        temperature_unit: "°F",
      },
    }, "climate.office");

    expect(mapped).toMatchObject({
      entityId: "climate.office",
      state: "heat_cool",
      targetLow: 66,
      targetHigh: 75,
      minTemp: 60,
      maxTemp: 86,
      step: 1,
      unit: "°F",
    });
    expect(mapped.currentTemperature).toBeUndefined();
    expect(mapped.targetTemperature).toBeUndefined();
  });

  it("preserves explicit unknown/unavailable semantics without fabricating readings", () => {
    const unknown = climateFromHass({ ...raw, state: "unknown", attributes: { friendly_name: "Starting" } }, "climate.starting");
    const unavailable = climateFromHass({ ...raw, state: "unavailable", attributes: { friendly_name: "Garage", last_seen: "2026-10-19T08:20:00Z" } }, "climate.garage");
    const missing = climateFromHass(undefined, "climate.missing", { name: "Missing" });

    expect(unknown).toMatchObject({ state: "unavailable", name: "Starting", hvacModes: [] });
    expect(unknown.hvacAction).toBeUndefined();
    expect(unavailable).toMatchObject({ state: "unavailable", name: "Garage" });
    expect(unavailable.lastSeen).toBeDefined();
    expect(missing).toMatchObject({ state: "unavailable", name: "Missing", hvacModes: [] });
    expect(missing.currentTemperature).toBeUndefined();
    expect(missing.targetTemperature).toBeUndefined();
  });

  it("tells a room temperature not sent yet from one the thermostat never reports, by its attribute", () => {
    const without: Record<string, unknown> = { ...raw.attributes };
    delete without.current_temperature;
    // The attribute is there with no number in it yet: it reports one, not yet ("No reading yet").
    const notYet = climateFromHass({ ...raw, attributes: { ...raw.attributes, current_temperature: null } }, raw.entity_id);
    expect(notYet.currentTemperature).toBeUndefined();
    expect(notYet.reportsCurrentTemperature).toBeUndefined();
    // Home Assistant's native attribute counts too.
    expect(climateFromHass({ ...raw, attributes: { ...without, native_current_temperature: null } }, raw.entity_id).reportsCurrentTemperature).toBeUndefined();
    // No attribute at all: it never reports one ("Not reported").
    const never = climateFromHass({ ...raw, attributes: without }, raw.entity_id);
    expect(never.currentTemperature).toBeUndefined();
    expect(never.reportsCurrentTemperature).toBe(false);
    // A reading says it reports one; unavailable or missing, nothing is said of it.
    expect(climateFromHass(raw, raw.entity_id).reportsCurrentTemperature).toBeUndefined();
    expect(climateFromHass({ ...raw, state: "unavailable", attributes: without }, raw.entity_id).reportsCurrentTemperature).toBeUndefined();
    expect(climateFromHass(undefined, "climate.missing").reportsCurrentTemperature).toBeUndefined();
  });

  it("omits out-of-range humidity readings", () => {
    const mapped = climateFromHass({
      ...raw,
      attributes: { ...raw.attributes, current_humidity: 999 },
    }, raw.entity_id);

    expect(mapped.currentHumidity).toBeUndefined();
  });

  it("does not expose stale measurements from unknown or unavailable raw entities", () => {
    const stale = climateFromHass({
      ...raw,
      state: "unavailable",
      attributes: {
        ...raw.attributes,
        current_temperature: 19,
        current_humidity: 55,
        temperature: 24,
        target_temp_low: 18,
        target_temp_high: 25,
        hvac_action: "heating",
      },
    }, "climate.stale");

    expect(stale.currentTemperature).toBeUndefined();
    expect(stale.currentHumidity).toBeUndefined();
    expect(stale.targetTemperature).toBeUndefined();
    expect(stale.targetLow).toBeUndefined();
    expect(stale.targetHigh).toBeUndefined();
    expect(stale.hvacAction).toBeUndefined();
  });

  it("preserves partial bounds and uses a unit-aware default only for the missing side", () => {
    const celsius = climateFromHass({
      ...raw,
      attributes: { min_temp: 10, temperature: 20 },
    }, "climate.partial");
    const fahrenheit = climateFromHass({
      ...raw,
      attributes: { temperature: 70, temperature_unit: "°F" },
    }, "climate.fahrenheit");

    expect(celsius).toMatchObject({ minTemp: 10, maxTemp: 35 });
    expect(fahrenheit).toMatchObject({ unit: "°F", minTemp: 44.6, maxTemp: 95, targetTemperature: 70 });
  });

  it("takes the house's unit system when the entity names no unit, as a real climate entity doesn't", () => {
    const us = climateFromHass({ ...raw, attributes: { current_temperature: 68, temperature: 70, min_temp: 45, max_temp: 95 } }, "climate.us", { systemUnit: "°F" });
    expect(us).toMatchObject({ unit: "°F", currentTemperature: 68, targetTemperature: 70 });
    expect(climateFromHass({ ...raw, attributes: { temperature: 70 } }, "climate.us", { unit: "°C", systemUnit: "°F" }).unit).toBe("°C");
  });

  it("omits setpoints outside the reported control bounds", () => {
    const mapped = climateFromHass({
      ...raw,
      attributes: {
        ...raw.attributes,
        min_temp: 10,
        max_temp: 20,
        target_temp_low: 30,
        target_temp_high: 40,
        temperature: 30,
      },
    }, "climate.outside");

    expect(mapped.minTemp).toBe(10);
    expect(mapped.maxTemp).toBe(20);
    expect(mapped.targetLow).toBeUndefined();
    expect(mapped.targetHigh).toBeUndefined();
    expect(mapped.targetTemperature).toBeUndefined();
  });

  it("filters unsupported capability values and uses documented control defaults only for missing metadata", () => {
    const mapped = climateFromHass({
      ...raw,
      attributes: {
        hvac_modes: ["heat", "not_a_mode", "heat"],
        hvac_action: "not_an_action",
        min_temp: 7,
        max_temp: 30,
      },
    }, "climate.partial");

    expect(mapped.hvacModes).toEqual(["heat"]);
    expect(mapped.hvacAction).toBeUndefined();
    expect(mapped.minTemp).toBe(7);
    expect(mapped.maxTemp).toBe(30);
    expect(mapped.step).toBe(0.5);
    expect(mapped.presetModes).toBeUndefined();
    expect(mapped.fanModes).toBeUndefined();
  });
});

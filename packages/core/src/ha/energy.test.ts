import { describe, expect, it, vi } from "vitest";
import { ENERGY_PREFS, readEnergyPrefs } from "./energy";

const PREFS = {
  energy_sources: [
    { type: "grid", stat_energy_from: "sensor.grid_import", stat_energy_to: "sensor.grid_export", stat_rate: "sensor.grid_power", cost_adjustment_day: 0 },
    { type: "solar", stat_energy_from: "sensor.solar_energy", config_entry_solar_forecast: null },
  ],
  device_consumption: [{ stat_consumption: "sensor.dishwasher_energy" }],
};

describe("readEnergyPrefs", () => {
  it("reads a configured house's preferences with energy/get_prefs", async () => {
    const send = vi.fn(async () => PREFS);
    expect(await readEnergyPrefs(send)).toEqual(PREFS);
    expect(send).toHaveBeenCalledWith({ type: ENERGY_PREFS });
    expect(ENERGY_PREFS).toBe("energy/get_prefs");
  });

  it("gives nothing when the energy dashboard was never set up: Home Assistant's not_found", async () => {
    expect(await readEnergyPrefs(async () => { throw { code: "not_found", message: "No prefs" }; })).toBeUndefined();
  });

  it("gives nothing on any other refusal, and on a send that throws before it answers", async () => {
    expect(await readEnergyPrefs(async () => { throw { code: "unknown_command", message: "Unknown command." }; })).toBeUndefined();
    expect(await readEnergyPrefs(() => { throw new TypeError("no connection"); })).toBeUndefined();
  });

  it("gives nothing for an answer that isn't preferences, and drops sources that aren't one", async () => {
    expect(await readEnergyPrefs(async () => null)).toBeUndefined();
    expect(await readEnergyPrefs(async () => ({ energy_sources: "grid" }))).toBeUndefined();
    expect(await readEnergyPrefs(async () => [])).toBeUndefined();
    expect(await readEnergyPrefs(async () => ({ energy_sources: [null, "grid", { stat_rate: "sensor.x" }, { type: "grid", stat_rate: "sensor.grid_power" }] })))
      .toEqual({ energy_sources: [{ type: "grid", stat_rate: "sensor.grid_power" }] });
  });
});

import { describe, expect, it, vi } from "vitest";
import { createClimateHandlers } from "./climate";
import type { ClimateEntity } from "../../widgets/climate/types";

const entity: ClimateEntity = {
  entityId: "climate.living_room",
  name: "Thermostat",
  state: "heat",
  hvacModes: ["off", "heat", "cool", "heat_cool"],
  hvacAction: "heating",
  currentTemperature: 20.4,
  targetTemperature: 21.5,
  targetLow: 19,
  targetHigh: 24,
  minTemp: 7,
  maxTemp: 30,
  step: 0.5,
  unit: "°C",
  presetMode: "home",
  presetModes: ["home", "away"],
  fanMode: "auto",
  fanModes: ["auto", "low"],
};

describe("createClimateHandlers", () => {
  it("builds native climate service payloads", async () => {
    const callService = vi.fn(async () => undefined);
    const handlers = createClimateHandlers({ callService }, entity);

    handlers.onToggle();
    handlers.onTargetChange(22);
    handlers.onRangeChange?.(24, 19);
    handlers.onModeChange?.("cool");
    handlers.onPresetChange?.("away");
    handlers.onFanChange?.("low");
    await Promise.resolve();

    expect(callService).toHaveBeenNthCalledWith(1, "climate", "turn_off", { entity_id: "climate.living_room" });
    expect(callService).toHaveBeenNthCalledWith(2, "climate", "set_temperature", { entity_id: "climate.living_room", temperature: 22 });
    expect(callService).toHaveBeenNthCalledWith(3, "climate", "set_temperature", {
      entity_id: "climate.living_room",
      target_temp_low: 19,
      target_temp_high: 24,
    });
    expect(callService).toHaveBeenNthCalledWith(4, "climate", "set_hvac_mode", { entity_id: "climate.living_room", hvac_mode: "cool" });
    expect(callService).toHaveBeenNthCalledWith(5, "climate", "set_preset_mode", { entity_id: "climate.living_room", preset_mode: "away" });
    expect(callService).toHaveBeenNthCalledWith(6, "climate", "set_fan_mode", { entity_id: "climate.living_room", fan_mode: "low" });
  });

  it("turns an off climate entity on without inventing a mode", async () => {
    const callService = vi.fn(async () => undefined);
    const handlers = createClimateHandlers({ callService }, { ...entity, state: "off" });

    handlers.onToggle();
    await Promise.resolve();

    expect(callService).toHaveBeenCalledWith("climate", "turn_on", { entity_id: "climate.living_room" });
  });

  it("gates unsupported capabilities and unavailable entities", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const handlers = createClimateHandlers({ callService }, {
      ...entity,
      state: "unavailable",
      hvacModes: ["off", "heat"],
      presetModes: undefined,
      fanModes: undefined,
    }, { onError });

    handlers.onToggle();
    handlers.onTargetChange(22);
    handlers.onRangeChange?.(19, 24);
    handlers.onModeChange?.("cool");
    handlers.onPresetChange?.("away");
    handlers.onFanChange?.("low");

    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
    expect(handlers.onRangeChange).toBeUndefined();
    expect(handlers.onPresetChange).toBeUndefined();
    expect(handlers.onFanChange).toBeUndefined();
  });

  it("rejects invalid values and capability values before transport", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const handlers = createClimateHandlers({ callService }, entity, { onError });

    handlers.onTargetChange(Number.NaN);
    handlers.onTargetChange(31);
    handlers.onRangeChange?.(Number.POSITIVE_INFINITY, 24);
    handlers.onModeChange?.("dry");
    handlers.onPresetChange?.("vacation");
    handlers.onFanChange?.("turbo");

    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(6);
    expect(onError.mock.calls.every(([error]) => error.code === "invalid_input" || error.code === "unsupported")).toBe(true);
  });

  it("rejects a target below a known partial lower bound", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const handlers = createClimateHandlers({ callService }, { ...entity, minTemp: 10, maxTemp: 35 }, { onError });

    handlers.onTargetChange(8);

    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "invalid_input" }));
  });

  it("normalizes service failures for the connected container", async () => {
    const failure = new Error("denied");
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw failure; });
    const handlers = createClimateHandlers({ callService }, entity, { onError });

    handlers.onToggle();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed", domain: "climate" }));
  });
});

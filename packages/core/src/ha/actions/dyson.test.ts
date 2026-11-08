import { describe, expect, it, vi } from "vitest";
import { createDysonHandlers } from "./dyson";
import type { DysonEntity } from "../../entities/dyson/types";

const entity: DysonEntity = {
  entityId: "fan.bedroom", name: "Bedroom", state: "on", supportsSpeed: true, speedCount: 10, percentage: 40,
  supportsAuto: true, auto: false, autoPreset: "Auto", manualPreset: "Normal", supportsOscillate: true, oscillating: true,
  oscillationModes: ["45°", "90°", "180°", "350°"], oscillationMode: "90°", oscillationCentre: 180, oscillationBy: "angle",
  supportsDirection: true, direction: "forward", supportsNightMode: true, nightMode: false,
  supportsHeat: true, heatOn: false, heatTarget: 21, heatMin: 1, heatMax: 37, heatStep: 1, heatUnit: "°C", air: [], filters: [],
};
const ids = { nightModeEntityId: "switch.bedroom_night_mode", heatEntityId: "climate.bedroom", oscillationModeEntityId: "select.bedroom_oscillation_mode" };
const setup = (e: Partial<DysonEntity> = {}) => {
  const callService = vi.fn(async () => undefined);
  const onError = vi.fn();
  return { callService, onError, handlers: createDysonHandlers({ callService }, { ...entity, ...e }, { ...ids, onError }) };
};

describe("createDysonHandlers", () => {
  it("runs the fan's own services as the fan's handlers do", () => {
    const { callService, handlers } = setup();
    handlers.onToggle();
    handlers.onPercentageChange(70);
    handlers.onDirectionChange("reverse");
    handlers.onOscillateChange(false);
    expect(callService.mock.calls).toEqual([
      ["fan", "toggle", { entity_id: "fan.bedroom" }],
      ["fan", "set_percentage", { entity_id: "fan.bedroom", percentage: 70 }],
      ["fan", "set_direction", { entity_id: "fan.bedroom", direction: "reverse" }],
      ["fan", "oscillate", { entity_id: "fan.bedroom", oscillating: false }],
    ]);
  });

  it("enters and leaves Auto by the fan's own presets", () => {
    const { callService, handlers } = setup();
    handlers.onAutoChange(true);
    handlers.onAutoChange(false);
    expect(callService.mock.calls).toEqual([
      ["fan", "set_preset_mode", { entity_id: "fan.bedroom", preset_mode: "Auto" }],
      ["fan", "set_preset_mode", { entity_id: "fan.bedroom", preset_mode: "Normal" }],
    ]);
  });

  it("sets a Pure Cool's sweep around its centre, and a Humidify+Cool's on its select", () => {
    const { callService, handlers } = setup();
    handlers.onOscillationModeChange("180°");
    handlers.onOscillationModeChange("350°");
    expect(callService.mock.calls).toEqual([
      ["dyson_local", "set_angle", { entity_id: "fan.bedroom", angle_low: 90, angle_high: 270 }],
      ["dyson_local", "set_angle", { entity_id: "fan.bedroom", angle_low: 5, angle_high: 355 }],
    ]);
    const select = setup({ oscillationBy: "select", oscillationModes: ["45°", "90°", "Breeze"] });
    select.handlers.onOscillationModeChange("Breeze");
    expect(select.callService).toHaveBeenCalledWith("select", "select_option", { entity_id: "select.bedroom_oscillation_mode", option: "Breeze" });
  });

  it("refuses a range it doesn't list", () => {
    const { callService, onError, handlers } = setup();
    handlers.onOscillationModeChange("Breeze");
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "invalid_input" }));
  });

  it("switches night mode and the heater on their own entities", () => {
    const { callService, handlers } = setup();
    handlers.onNightModeChange(true);
    handlers.onHeatChange(true);
    handlers.onHeatChange(false);
    handlers.onHeatTargetChange(23.4);
    handlers.onHeatTargetChange(60);
    expect(callService.mock.calls).toEqual([
      ["switch", "turn_on", { entity_id: "switch.bedroom_night_mode" }],
      ["climate", "set_hvac_mode", { entity_id: "climate.bedroom", hvac_mode: "heat" }],
      ["climate", "set_hvac_mode", { entity_id: "climate.bedroom", hvac_mode: "cool" }],
      ["climate", "set_temperature", { entity_id: "climate.bedroom", temperature: 23 }],
      ["climate", "set_temperature", { entity_id: "climate.bedroom", temperature: 37 }],
    ]);
  });

  it("reports what the device doesn't have, and sends nothing while unavailable", () => {
    const plain = setup({ supportsHeat: false, supportsNightMode: false, supportsAuto: false });
    plain.handlers.onHeatChange(true);
    plain.handlers.onNightModeChange(true);
    plain.handlers.onAutoChange(true);
    expect(plain.callService).not.toHaveBeenCalled();
    expect(plain.onError).toHaveBeenCalledTimes(3);
    expect(plain.onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported" }));
    const away = setup({ state: "unavailable" });
    away.handlers.onToggle();
    away.handlers.onHeatTargetChange(20);
    expect(away.callService).not.toHaveBeenCalled();
  });

  it("reports rejected actions", async () => {
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw new Error("denied"); });
    createDysonHandlers({ callService }, entity, { ...ids, onError }).onNightModeChange(true);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed", domain: "switch", service: "turn_on" })));
  });
});

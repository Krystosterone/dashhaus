import { describe, expect, it, vi } from "vitest";
import { createFanHandlers } from "./fan";
import type { FanDirection, FanEntity } from "../../entities/fan/types";

const entity: FanEntity = {
  entityId: "fan.bedroom",
  name: "Bedroom",
  state: "on",
  supportsSpeed: true,
  percentage: 67,
  speedCount: 3,
  supportsPreset: true,
  presetModes: ["normal", "sleep"],
  presetMode: "normal",
  supportsOscillate: true,
  oscillating: false,
  supportsDirection: true,
  direction: "forward",
};
const onOff: FanEntity = { entityId: "fan.bedroom", name: "Bedroom", state: "on" };

const setup = (e: FanEntity = entity) => {
  const callService = vi.fn(async () => undefined);
  const onError = vi.fn();
  return { callService, onError, handlers: createFanHandlers({ callService }, e, { onError }) };
};

describe("createFanHandlers", () => {
  it("calls the five native services", async () => {
    const { callService, handlers } = setup();
    handlers.onToggle();
    handlers.onPercentageChange(33);
    handlers.onPresetChange("sleep");
    handlers.onOscillateChange(true);
    handlers.onDirectionChange("reverse");
    await Promise.resolve();
    expect(callService.mock.calls).toEqual([
      ["fan", "toggle", { entity_id: "fan.bedroom" }],
      ["fan", "set_percentage", { entity_id: "fan.bedroom", percentage: 33 }],
      ["fan", "set_preset_mode", { entity_id: "fan.bedroom", preset_mode: "sleep" }],
      ["fan", "oscillate", { entity_id: "fan.bedroom", oscillating: true }],
      ["fan", "set_direction", { entity_id: "fan.bedroom", direction: "reverse" }],
    ]);
  });

  it("sends a whole speed from 1 to 100, so a groove never switches the fan off", () => {
    const { callService, handlers } = setup();
    handlers.onPercentageChange(0);
    handlers.onPercentageChange(120);
    handlers.onPercentageChange(66.6);
    expect(callService.mock.calls.map((call) => (call as unknown[])[2])).toEqual([
      { entity_id: "fan.bedroom", percentage: 1 },
      { entity_id: "fan.bedroom", percentage: 100 },
      { entity_id: "fan.bedroom", percentage: 67 },
    ]);
  });

  it("gates each control on the feature the fan declares", () => {
    const { callService, onError, handlers } = setup(onOff);
    handlers.onPercentageChange(50);
    handlers.onPresetChange("sleep");
    handlers.onOscillateChange(true);
    handlers.onDirectionChange("reverse");
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(4);
    for (const [error] of onError.mock.calls) expect(error).toMatchObject({ code: "unsupported", domain: "fan", entityId: "fan.bedroom" });
    handlers.onToggle();
    expect(callService).toHaveBeenCalledWith("fan", "toggle", { entity_id: "fan.bedroom" });
  });

  it("refuses input the fan can't take", () => {
    const { callService, onError, handlers } = setup();
    handlers.onPercentageChange(Number.NaN);
    handlers.onPresetChange("turbo");
    handlers.onDirectionChange("sideways" as FanDirection);
    expect(callService).not.toHaveBeenCalled();
    expect(onError.mock.calls.map(([error]) => error.code)).toEqual(["invalid_input", "invalid_input", "invalid_input"]);
  });

  it("does not call any service for an unavailable entity and reports unsupported", () => {
    const { callService, onError, handlers } = setup({ ...entity, state: "unavailable" });
    handlers.onToggle();
    handlers.onPercentageChange(50);
    handlers.onPresetChange("sleep");
    handlers.onOscillateChange(true);
    handlers.onDirectionChange("reverse");
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(5);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported", domain: "fan", entityId: "fan.bedroom" }));
  });

  it("reports rejected actions", async () => {
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw new Error("denied"); });
    createFanHandlers({ callService }, entity, { onError }).onPercentageChange(50);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed", domain: "fan", service: "set_percentage" })));
  });
});

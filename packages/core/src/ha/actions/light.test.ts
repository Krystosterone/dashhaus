import { describe, expect, it, vi } from "vitest";
import { createLightHandlers } from "./light";
import { lightFromHass } from "../mappers/light";
import type { LightEntity } from "../../entities/light/types";

const entity: LightEntity = {
  entityId: "light.living_room",
  name: "Living room",
  state: "on",
  supportsBrightness: true,
  brightness: 50,
  supportsColorTemp: true,
  kelvin: 3000,
  minKelvin: 2000,
  maxKelvin: 5000,
};

describe("createLightHandlers", () => {
  it("sets a colour as hs_color, and only on a lamp that takes one", async () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    createLightHandlers({ callService }, { ...entity, supportsColor: true }, { onError }).onColorChange?.([31, 94]);
    createLightHandlers({ callService }, { ...entity, supportsColor: true }, { onError }).onColorChange?.([31, 140]);
    await Promise.resolve();

    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith("light", "turn_on", { entity_id: "light.living_room", hs_color: [31, 94] });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "invalid_input" }));
    expect(createLightHandlers({ callService }, entity).onColorChange).toBeUndefined();
  });

  it("builds native light service payloads and clamps brightness", async () => {
    const callService = vi.fn(async () => undefined);
    const handlers = createLightHandlers({ callService }, entity);

    handlers.onToggle();
    handlers.onBrightnessChange(120);
    handlers.onKelvinChange?.(2800);
    await Promise.resolve();

    expect(callService).toHaveBeenNthCalledWith(1, "light", "toggle", { entity_id: "light.living_room" });
    expect(callService).toHaveBeenNthCalledWith(2, "light", "turn_on", { entity_id: "light.living_room", brightness_pct: 100 });
    expect(callService).toHaveBeenNthCalledWith(3, "light", "turn_on", { entity_id: "light.living_room", color_temp_kelvin: 2800 });
  });

  it("drives a light Home Assistant reports as unknown, and refuses an unavailable one", async () => {
    // A light group before its first state: no reading, but it switches and dims.
    const raw = { entity_id: "light.group", attributes: { supported_color_modes: ["brightness"] }, last_changed: "2026-10-19T10:00:00Z", last_updated: "2026-10-19T10:00:00Z" };
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const unknown = createLightHandlers({ callService }, lightFromHass({ ...raw, state: "unknown" }, raw.entity_id), { onError });
    unknown.onToggle();
    unknown.onBrightnessChange(40);
    createLightHandlers({ callService }, lightFromHass({ ...raw, state: "unavailable" }, raw.entity_id), { onError }).onToggle();
    await Promise.resolve();

    expect(callService.mock.calls).toEqual([
      ["light", "toggle", { entity_id: "light.group" }],
      ["light", "turn_on", { entity_id: "light.group", brightness_pct: 40 }],
    ]);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported" }));
  });

  it("does not expose unsupported color-temperature actions", () => {
    const handlers = createLightHandlers({ callService: vi.fn(async () => undefined) }, { ...entity, supportsColorTemp: false });
    expect(handlers.onKelvinChange).toBeUndefined();
  });

  it("reports rejected actions without swallowing the error at the boundary", async () => {
    const failure = new Error("denied");
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw failure; });
    const handlers = createLightHandlers({ callService }, entity, { onError });

    handlers.onToggle();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed" }));
  });

  it("rejects non-finite and out-of-range numeric actions before transport", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const handlers = createLightHandlers({ callService }, entity, { onError });

    handlers.onBrightnessChange(Number.NaN);
    handlers.onKelvinChange?.(10_000);

    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenNthCalledWith(1, expect.objectContaining({ code: "invalid_input" }));
    expect(onError).toHaveBeenNthCalledWith(2, expect.objectContaining({ code: "invalid_input" }));
  });

  it("turns on and off apart only a light whose state is assumed or unknown", async () => {
    const callService = vi.fn(async () => undefined);
    expect(createLightHandlers({ callService }, entity).onTurnOff).toBeUndefined();
    createLightHandlers({ callService }, { ...entity, assumedState: true }).onTurnOn?.();
    createLightHandlers({ callService }, { ...entity, state: "unknown" }).onTurnOff?.();
    await Promise.resolve();

    expect(callService.mock.calls).toEqual([
      ["light", "turn_on", { entity_id: "light.living_room" }],
      ["light", "turn_off", { entity_id: "light.living_room" }],
    ]);
  });
});

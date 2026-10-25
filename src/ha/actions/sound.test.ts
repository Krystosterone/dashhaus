import { describe, expect, it, vi } from "vitest";
import { createSoundHandlers } from "./sound";
import type { SoundEntity } from "../../widgets/sound/types";

const entity: SoundEntity = { entityId: "switch.bedroom", name: "Bedroom", state: "on" };

describe("createSoundHandlers", () => {
  it("calls the native toggle service", async () => {
    const callService = vi.fn(async () => undefined);
    createSoundHandlers({ callService }, entity).onToggle();
    await Promise.resolve();
    expect(callService).toHaveBeenCalledWith("switch", "toggle", { entity_id: "switch.bedroom" });
  });

  it("does not call the service for an unavailable entity and reports unsupported", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    createSoundHandlers({ callService }, { ...entity, state: "unavailable" }, { onError }).onToggle();
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported", domain: "switch", entityId: "switch.bedroom" }));
  });

  it("reports rejected actions", async () => {
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw new Error("denied"); });
    createSoundHandlers({ callService }, entity, { onError }).onToggle();
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed", domain: "switch", service: "toggle" })));
  });

  it("sets the volume in the number's own range and step, without switching the sound", async () => {
    const callService = vi.fn(async () => undefined);
    const percent = createSoundHandlers({ callService }, entity, { volume: { entityId: "number.nursery_volume", min: 0, max: 100, step: 1 } }).onVolumeChange;
    percent?.(62.4);
    percent?.(140);
    const levels = createSoundHandlers({ callService }, { ...entity, state: "off" }, { volume: { entityId: "number.noise_volume", min: 1, max: 16, step: 1 } }).onVolumeChange;
    levels?.(33);
    const tenths = createSoundHandlers({ callService }, entity, { volume: { entityId: "number.noise_volume", min: 0, max: 1, step: 0.1 } }).onVolumeChange;
    tenths?.(30);
    await Promise.resolve();

    expect(callService.mock.calls).toEqual([
      ["number", "set_value", { entity_id: "number.nursery_volume", value: 62 }],
      ["number", "set_value", { entity_id: "number.nursery_volume", value: 100 }],
      ["number", "set_value", { entity_id: "number.noise_volume", value: 6 }],
      ["number", "set_value", { entity_id: "number.noise_volume", value: 0.3 }],
    ]);
  });

  it("has no volume to set without a volume entity, and sets none while the sound is unavailable", () => {
    const callService = vi.fn(async () => undefined);
    expect(createSoundHandlers({ callService }, entity).onVolumeChange).toBeUndefined();
    createSoundHandlers({ callService }, { ...entity, state: "unavailable" }, { volume: { entityId: "number.v", min: 0, max: 100, step: 1 } }).onVolumeChange?.(50);
    expect(callService).not.toHaveBeenCalled();
  });
});

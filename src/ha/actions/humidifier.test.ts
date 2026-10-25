import { describe, expect, it, vi } from "vitest";
import { createHumidifierHandlers } from "./humidifier";
import type { HumidifierEntity } from "../../domains/humidifier/types";

const entity: HumidifierEntity = { entityId: "humidifier.bedroom", name: "Bedroom", state: "on", targetHumidity: 45, minHumidity: 30, maxHumidity: 80, mode: "normal", modes: ["normal", "eco"] };

describe("createHumidifierHandlers", () => {
  it("calls the native toggle service", async () => {
    const callService = vi.fn(async () => undefined);
    createHumidifierHandlers({ callService }, entity).onToggle();
    await Promise.resolve();
    expect(callService).toHaveBeenCalledWith("humidifier", "toggle", { entity_id: "humidifier.bedroom" });
  });

  it("sets whole-percent humidity within the bounds", async () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const handlers = createHumidifierHandlers({ callService }, entity, { onError });
    handlers.onTargetChange?.(46.4);
    handlers.onTargetChange?.(81);
    handlers.onTargetChange?.(Number.NaN);
    await Promise.resolve();
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith("humidifier", "set_humidity", { entity_id: "humidifier.bedroom", humidity: 46 });
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "invalid_input" }));
  });

  it("sets only the modes the entity lists", async () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const handlers = createHumidifierHandlers({ callService }, entity, { onError });
    handlers.onModeChange?.("eco");
    handlers.onModeChange?.("turbo");
    await Promise.resolve();
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith("humidifier", "set_mode", { entity_id: "humidifier.bedroom", mode: "eco" });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported" }));
  });

  it("offers no setpoint or modes the device doesn't report", () => {
    const handlers = createHumidifierHandlers({ callService: vi.fn() }, { ...entity, targetHumidity: undefined, modes: undefined });
    expect(handlers.onTargetChange).toBeUndefined();
    expect(handlers.onModeChange).toBeUndefined();
  });

  it("does not call the service for an unavailable entity and reports unsupported", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    createHumidifierHandlers({ callService }, { ...entity, state: "unavailable" }, { onError }).onToggle();
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported", domain: "humidifier", entityId: "humidifier.bedroom" }));
  });

  it("reports rejected actions", async () => {
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw new Error("denied"); });
    createHumidifierHandlers({ callService }, entity, { onError }).onToggle();
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed", domain: "humidifier", service: "toggle" })));
  });
});

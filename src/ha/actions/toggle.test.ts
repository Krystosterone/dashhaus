import { describe, expect, it, vi } from "vitest";
import { createToggleHandlers } from "./toggle";
import type { ToggleEntity } from "../../domains/toggle/types";

const entity: ToggleEntity = {
  entityId: "input_boolean.guest_mode",
  name: "Guest",
  state: "on",
};

describe("createToggleHandlers", () => {
  it("calls the native toggle service on the entity's own domain", async () => {
    const callService = vi.fn(async () => undefined);
    const handlers = createToggleHandlers({ callService }, entity);

    handlers.onToggle();
    await Promise.resolve();

    expect(callService).toHaveBeenCalledWith("input_boolean", "toggle", { entity_id: "input_boolean.guest_mode" });
  });

  it("targets the switch domain for switch entities", async () => {
    const callService = vi.fn(async () => undefined);
    const handlers = createToggleHandlers({ callService }, { ...entity, entityId: "switch.porch" });

    handlers.onToggle();
    await Promise.resolve();

    expect(callService).toHaveBeenCalledWith("switch", "toggle", { entity_id: "switch.porch" });
  });

  it("does not call the service for an unavailable entity and reports unsupported", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const handlers = createToggleHandlers({ callService }, { ...entity, state: "unavailable" }, { onError });

    handlers.onToggle();

    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported", domain: "input_boolean", entityId: "input_boolean.guest_mode" }));
  });

  it("reports rejected actions without swallowing the error at the boundary", async () => {
    const failure = new Error("denied");
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw failure; });
    const handlers = createToggleHandlers({ callService }, entity, { onError });

    handlers.onToggle();
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed", domain: "input_boolean", service: "toggle" }));
  });

  it("reports an entity of another domain as unsupported, without calling a service", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    createToggleHandlers({ callService }, { ...entity, entityId: "light.porch" }, { onError }).onToggle();
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported", domain: "light", entityId: "light.porch" }));
  });

  it("does not expose a timed-on handler", () => {
    const handlers = createToggleHandlers({ callService: vi.fn(async () => undefined) }, entity);
    expect("onTurnOnFor" in handlers).toBe(false);
  });
});

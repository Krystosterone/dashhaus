import { describe, expect, it, vi } from "vitest";
import { create__Name__Handlers } from "./__name__";
import type { __Name__Entity } from "../../widgets/__name__/types";

const entity: __Name__Entity = { entityId: "__domain__.bedroom", name: "Bedroom", state: "on" };

describe("create__Name__Handlers", () => {
  it("calls the native toggle service", async () => {
    const callService = vi.fn(async () => undefined);
    create__Name__Handlers({ callService }, entity).onToggle();
    await Promise.resolve();
    expect(callService).toHaveBeenCalledWith("__domain__", "toggle", { entity_id: "__domain__.bedroom" });
  });

  it("does not call the service for an unavailable entity and reports unsupported", () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    create__Name__Handlers({ callService }, { ...entity, state: "unavailable" }, { onError }).onToggle();
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported", domain: "__domain__", entityId: "__domain__.bedroom" }));
  });

  it("reports rejected actions", async () => {
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw new Error("denied"); });
    create__Name__Handlers({ callService }, entity, { onError }).onToggle();
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed", domain: "__domain__", service: "toggle" })));
  });
});

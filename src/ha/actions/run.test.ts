import { describe, expect, it, vi } from "vitest";
import { serviceRunner } from "./run";
import { HaActionError } from "../types";

const entity = { entityId: "fan.bedroom", state: "on" };

describe("serviceRunner", () => {
  it("calls the service on the domain with the entity id", async () => {
    const callService = vi.fn(async () => undefined);
    serviceRunner({ callService }, "fan", entity).run("set_percentage", { percentage: 40 });
    await Promise.resolve();
    expect(callService).toHaveBeenCalledWith("fan", "set_percentage", { entity_id: "fan.bedroom", percentage: 40 });
  });

  it("replaces a raw rejection with a sanitized service_failed error", async () => {
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw new Error("secret provider message"); });
    serviceRunner({ callService }, "fan", entity, onError).run("toggle");
    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    const error = onError.mock.calls[0][0] as HaActionError;
    expect(error).toMatchObject({ code: "service_failed", domain: "fan", service: "toggle", entityId: "fan.bedroom" });
    expect(error.message).not.toContain("secret");
  });

  it("passes an HaActionError rejection through", async () => {
    const onError = vi.fn();
    const failure = new HaActionError("not_connected", "Not connected");
    serviceRunner({ callService: vi.fn(async () => { throw failure; }) }, "fan", entity, onError).run("toggle");
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(failure));
  });

  it("reports unsupported and invalid input without calling the service", () => {
    const onError = vi.fn();
    const callService = vi.fn(async () => undefined);
    const runner = serviceRunner({ callService }, "fan", entity, onError);
    runner.unsupported("no oscillation");
    runner.invalidInput("speed must be finite");
    expect(callService).not.toHaveBeenCalled();
    expect(onError.mock.calls.map(([e]) => e.code)).toEqual(["unsupported", "invalid_input"]);
  });

  it("is actionable unless the entity is unavailable", () => {
    const onError = vi.fn();
    const caller = { callService: vi.fn(async () => undefined) };
    expect(serviceRunner(caller, "fan", entity, onError).actionable()).toBe(true);
    expect(serviceRunner(caller, "fan", { ...entity, state: "unavailable" }, onError).actionable()).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported", entityId: "fan.bedroom" }));
  });
});

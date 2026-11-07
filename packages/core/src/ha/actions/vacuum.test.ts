import { describe, expect, it, vi } from "vitest";
import { createVacuumHandlers, VACUUM_ACTIONS } from "./vacuum";
import type { VacuumEntity } from "../../entities/vacuum/types";

const entity: VacuumEntity = {
  entityId: "vacuum.hall",
  name: "Robot vacuum",
  state: "docked",
  supportsStart: true,
  supportsPause: true,
  supportsReturn: true,
  supportsLocate: true,
  supportsFanSpeed: true,
  fanSpeeds: ["quiet", "standard", "turbo"],
  fanSpeed: "standard",
};

const setup = (e: VacuumEntity = entity) => {
  const callService = vi.fn(async () => undefined);
  const onError = vi.fn();
  return { callService, onError, handlers: createVacuumHandlers({ callService }, e, { onError }) };
};

describe("createVacuumHandlers", () => {
  it("calls the five native services", async () => {
    const { callService, handlers } = setup();
    handlers.onStart();
    handlers.onPause();
    handlers.onReturnToBase();
    handlers.onLocate();
    handlers.onFanSpeedChange("turbo");
    await Promise.resolve();
    expect(callService.mock.calls).toEqual([
      ["vacuum", "start", { entity_id: "vacuum.hall" }],
      ["vacuum", "pause", { entity_id: "vacuum.hall" }],
      ["vacuum", "return_to_base", { entity_id: "vacuum.hall" }],
      ["vacuum", "locate", { entity_id: "vacuum.hall" }],
      ["vacuum", "set_fan_speed", { entity_id: "vacuum.hall", fan_speed: "turbo" }],
    ]);
  });

  it("sends nothing a vacuum doesn't declare, and reports it unsupported", () => {
    const { callService, onError, handlers } = setup({ entityId: "vacuum.hall", name: "Robot vacuum", state: "idle" });
    handlers.onStart();
    handlers.onPause();
    handlers.onReturnToBase();
    handlers.onLocate();
    handlers.onFanSpeedChange("turbo");
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(5);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported", domain: "vacuum", entityId: "vacuum.hall" }));
  });

  it("refuses a fan speed it doesn't list", () => {
    const { callService, onError, handlers } = setup();
    handlers.onFanSpeedChange("max");
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "invalid_input" }));
  });

  it("does nothing while unavailable", () => {
    const { callService, onError, handlers } = setup({ ...entity, state: "unavailable" });
    handlers.onStart();
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported" }));
  });

  it("reports rejected actions", async () => {
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw new Error("denied"); });
    createVacuumHandlers({ callService }, entity, { onError }).onLocate();
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed", domain: "vacuum", service: "locate" })));
  });

  it("declares every action: four presses and a choice of fan speed", () => {
    expect(VACUUM_ACTIONS.onFanSpeedChange).toEqual({ takes: "choice", field: "fanSpeed", options: "fanSpeeds" });
    expect([VACUUM_ACTIONS.onStart, VACUUM_ACTIONS.onPause, VACUUM_ACTIONS.onReturnToBase, VACUUM_ACTIONS.onLocate].every((a) => a.takes === "nothing")).toBe(true);
  });
});

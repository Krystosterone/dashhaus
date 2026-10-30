import { describe, expect, it, vi } from "vitest";
import { createAlarmHandlers } from "./alarm";
import { HaActionError } from "../types";
import type { AlarmEntity } from "../../entities/alarm/types";

const entity: AlarmEntity = {
  entityId: "alarm_control_panel.main",
  name: "Main alarm",
  state: "disarmed",
  modes: ["home", "away", "night"],
  codeFormat: "number",
  codeArmRequired: true,
};

const caller = (callService: (domain: string, service: string, data: Record<string, unknown>) => Promise<unknown>) => ({ callService });

describe("createAlarmHandlers", () => {
  it("arms in a mode with the code and resolves true", async () => {
    const callService = vi.fn(async () => undefined);
    const handlers = createAlarmHandlers(caller(callService), entity);

    await expect(handlers.onArm("away", "1234")).resolves.toBe(true);
    expect(callService).toHaveBeenCalledWith("alarm_control_panel", "alarm_arm_away", {
      entity_id: "alarm_control_panel.main",
      code: "1234",
    });
  });

  it("disarms without a code when none is provided", async () => {
    const callService = vi.fn(async () => undefined);
    const handlers = createAlarmHandlers(caller(callService), entity);

    await expect(handlers.onDisarm()).resolves.toBe(true);
    expect(callService).toHaveBeenCalledWith("alarm_control_panel", "alarm_disarm", {
      entity_id: "alarm_control_panel.main",
    });
  });

  it("resolves false for a wrong code reported by translationKey", async () => {
    const callService = vi.fn(async () => {
      throw Object.assign(new HaActionError("service_failed", "rejected"), { translationKey: "invalid_code" });
    });
    const handlers = createAlarmHandlers(caller(callService), entity);

    await expect(handlers.onDisarm("9999")).resolves.toBe(false);
  });

  it("rethrows a bare service_validation_error instead of treating it as a wrong code", async () => {
    const callService = vi.fn(async () => {
      throw Object.assign(new HaActionError("service_failed", "rejected"), { providerCode: "service_validation_error" });
    });
    const handlers = createAlarmHandlers(caller(callService), entity);

    await expect(handlers.onDisarm("9999")).rejects.toBeInstanceOf(HaActionError);
  });

  it("rethrows any other rejection", async () => {
    const callService = vi.fn(async () => { throw new Error("offline"); });
    const handlers = createAlarmHandlers(caller(callService), entity);

    await expect(handlers.onDisarm("1234")).rejects.toThrow("offline");
  });

  it("rejects an unsupported arm mode before transport", async () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const handlers = createAlarmHandlers(caller(callService), entity, { onError });

    await expect(handlers.onArm("vacation", "1234")).rejects.toThrow("does not support arming vacation");
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported" }));
  });

  it("never passes the code into error handling or logging", async () => {
    const callService = vi.fn(async () => { throw new Error("offline"); });
    const onError = vi.fn();
    const handlers = createAlarmHandlers(caller(callService), entity, { onError });

    await expect(handlers.onArm("away", "1234")).rejects.toThrow("offline");
    expect(onError).toHaveBeenCalledTimes(1);
    const reported = onError.mock.calls[0][0] as HaActionError;
    expect(JSON.stringify(reported)).not.toContain("1234");
  });
});

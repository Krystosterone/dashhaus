import { describe, expect, it, vi } from "vitest";
import { createOwletHandlers } from "./owlet";
import type { OwletEntity } from "../../widgets/owlet/types";

const sock: OwletEntity = { entityId: "sensor.owlet_sock_1_sleep_state", name: "Nova", state: "deep_sleep", baseOn: true };
const baseEntityId = "switch.owlet_sock_1_base_station_on";

describe("createOwletHandlers", () => {
  it("turns the base station off while it is on, and on while it is off, never toggling", async () => {
    const callService = vi.fn(async () => undefined);
    createOwletHandlers({ callService }, sock, { baseEntityId }).onBaseToggle?.();
    createOwletHandlers({ callService }, { ...sock, baseOn: false }, { baseEntityId }).onBaseToggle?.();
    await Promise.resolve();
    expect(callService.mock.calls).toEqual([
      ["switch", "turn_off", { entity_id: baseEntityId }],
      ["switch", "turn_on", { entity_id: baseEntityId }],
    ]);
  });

  it("offers nothing without a base station switch, or while its state is unknown", () => {
    const callService = vi.fn(async () => undefined);
    expect(createOwletHandlers({ callService }, sock).onBaseToggle).toBeUndefined();
    expect(createOwletHandlers({ callService }, { ...sock, baseOn: undefined }, { baseEntityId }).onBaseToggle).toBeUndefined();
  });

  it("reports rejected actions", async () => {
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw new Error("denied"); });
    createOwletHandlers({ callService }, sock, { baseEntityId, onError }).onBaseToggle?.();
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed", domain: "switch", service: "turn_off", entityId: baseEntityId })));
  });
});

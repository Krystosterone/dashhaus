import { describe, expect, it, vi } from "vitest";
import { GUEST_WIFI_ACTIONS, createGuestWifiHandlers } from "./guestWifi";
import { HaActionError } from "../types";

const caller = () => ({ callService: vi.fn().mockResolvedValue({ success: true }) });
const refresh = { entityId: "button.maple_update", state: "unknown" };
const newCode = { entityId: "button.maple_create", state: "2026-11-05T21:00:00+00:00" };

describe("createGuestWifiHandlers", () => {
  it("presses the create button for a new code, and answers once Home Assistant has", async () => {
    const store = caller();
    const { onNewCode } = createGuestWifiHandlers(store, { refresh, newCode });
    await onNewCode!();
    expect(store.callService).toHaveBeenCalledWith("button", "press", { entity_id: "button.maple_create" });
  });

  it("presses the update button to fetch the codes again", async () => {
    const store = caller();
    await createGuestWifiHandlers(store, { refresh, newCode }).onRefresh!();
    expect(store.callService).toHaveBeenCalledWith("button", "press", { entity_id: "button.maple_update" });
  });

  it("presses an input_button, or runs a script, the same way", async () => {
    const store = caller();
    const handlers = createGuestWifiHandlers(store, { newCode: { entityId: "script.new_guest_password", state: "off" }, refresh: { entityId: "input_button.fetch_guest_code", state: "unknown" } });
    await handlers.onNewCode!();
    await handlers.onRefresh!();
    expect(store.callService.mock.calls).toEqual([
      ["script", "turn_on", { entity_id: "script.new_guest_password" }],
      ["input_button", "press", { entity_id: "input_button.fetch_guest_code" }],
    ]);
  });

  it("offers nothing for an entity it can't press", () => {
    expect(createGuestWifiHandlers(caller(), { newCode: { entityId: "switch.guest_wifi", state: "on" } }).onNewCode).toBeUndefined();
  });

  it("offers no action for a button that is missing or unavailable", () => {
    const handlers = createGuestWifiHandlers(caller(), { refresh: { ...refresh, state: "unavailable" } });
    expect(handlers.onRefresh).toBeUndefined();
    expect(handlers.onNewCode).toBeUndefined();
  });

  it("reports a rejection, sanitized, and never throws", async () => {
    const onError = vi.fn();
    const store = { callService: vi.fn().mockRejectedValue(new Error("secret detail")) };
    await expect(createGuestWifiHandlers(store, { newCode, onError }).onNewCode!()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(expect.any(HaActionError));
    expect(onError.mock.calls[0][0].message).not.toContain("secret");
  });

  it("declares both actions as a press, a new password asked first", () => {
    expect(GUEST_WIFI_ACTIONS).toEqual({
      onRefresh: { takes: "nothing" },
      onNewCode: { takes: "nothing", asks: true, when: { access: ["password"] } },
    });
  });
});

import { describe, expect, it } from "vitest";
import { GUEST_WIFI_DEMO_ID, GUEST_WIFI_DEMO_PASSWORD, createDemoGuestWifiHaTransport } from "./guestWifi";
import type { HassEntities } from "../ha/types";

const subscribe = async () => {
  const transport = createDemoGuestWifiHaTransport();
  const seen: { latest?: HassEntities } = {};
  transport.subscribeEntities((entities) => { seen.latest = entities; });
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  return { transport, seen };
};

describe("createDemoGuestWifiHaTransport", () => {
  it("publishes the code, its QR code and its buttons", async () => {
    const { seen } = await subscribe();
    expect(seen.latest?.[GUEST_WIFI_DEMO_ID]).toMatchObject({ state: "98668-49366", attributes: { wlan_name: "Maple Guests", quota: 1 } });
    expect(seen.latest?.["image.guest_wifi_qr_code"].attributes.entity_picture).toMatch(/^data:image\/svg\+xml,/);
  });

  it("makes a new code when the create button is pressed", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("button", "press", { entity_id: "button.guest_wifi_create" });
    expect(seen.latest?.[GUEST_WIFI_DEMO_ID].state).toMatch(/^\d{5}-\d{5}$/);
    expect(seen.latest?.[GUEST_WIFI_DEMO_ID].state).not.toBe("98668-49366");
    expect(seen.latest?.["button.guest_wifi_create"].state).not.toBe("unknown");
  });

  it("fetches the codes again when the update button is pressed, keeping the code", async () => {
    const { transport, seen } = await subscribe();
    const before = seen.latest?.[GUEST_WIFI_DEMO_ID].last_updated;
    await new Promise((resolve) => setTimeout(resolve, 2));
    await transport.callService("button", "press", { entity_id: "button.guest_wifi_update" });
    expect(seen.latest?.[GUEST_WIFI_DEMO_ID].state).toBe("98668-49366");
    expect(seen.latest?.[GUEST_WIFI_DEMO_ID].last_updated).not.toBe(before);
  });

  it("changes the password when its script runs", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("script", "turn_on", { entity_id: GUEST_WIFI_DEMO_PASSWORD.newCode });
    expect(seen.latest?.[GUEST_WIFI_DEMO_PASSWORD.entityId].state).toMatch(/^\w+-\w+-\w+-\d{2}$/);
  });

  it("refuses every other call", async () => {
    const transport = createDemoGuestWifiHaTransport();
    await expect(transport.callService("sensor", "set_value", { entity_id: GUEST_WIFI_DEMO_ID })).rejects.toThrow("read-only");
    await expect(transport.callService("button", "press", { entity_id: GUEST_WIFI_DEMO_ID })).rejects.toThrow();
    await expect(transport.callService("button", "press", { entity_id: "button.missing" })).rejects.toThrow();
  });
});

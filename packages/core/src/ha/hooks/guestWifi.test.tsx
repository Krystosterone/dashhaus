import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useHaGuestWifi } from "./guestWifi";
import { HaProvider } from "../provider";
import { createHaStore } from "../store";
import type { HassEntities, HassEntity, HaTransport } from "../types";
import { fakeTransport } from "../../testing";
import { GUEST_WIFI_DEMO_ID, GUEST_WIFI_DEMO_PASSWORD, createDemoGuestWifiHaTransport } from "../../demo/guestWifi";

const stamp = "2026-11-07T10:00:00Z";
const entity = (entity_id: string, state: string, attributes: HassEntity["attributes"] = {}): HassEntity => ({ entity_id, state, attributes, last_changed: stamp, last_updated: stamp });
const raw: HassEntities = {
  "sensor.maple_voucher": entity("sensor.maple_voucher", "98668-49366", { wlan_name: "Maple Guests", quota: 1, used: 0 }),
  "image.maple_qr_code": entity("image.maple_qr_code", stamp, { entity_picture: "/api/image_proxy/image.maple_qr_code?token=one" }),
  "button.maple_create": entity("button.maple_create", "unknown"),
  "button.maple_update": entity("button.maple_update", "unknown"),
};

function setup(transport?: HaTransport, resolveUrl?: HaTransport["resolveUrl"]) {
  const fake = fakeTransport(raw);
  const base = transport ?? fake.transport;
  const store = createHaStore(resolveUrl ? { ...base, resolveUrl } : base);
  const wrapper = ({ children }: { children: ReactNode }) => <HaProvider store={store}>{children}</HaProvider>;
  return { ...fake, wrapper };
}

describe("useHaGuestWifi", () => {
  it("resolves the join QR code against Home Assistant, so it loads on another origin, and follows its token", async () => {
    const { wrapper, emitEntity } = setup(undefined, (path) => `http://ha.local:8123${path}`);
    const { result } = renderHook(() => useHaGuestWifi("sensor.maple_voucher"), { wrapper });

    await waitFor(() => expect(result.current.entity.qr).toBe("http://ha.local:8123/api/image_proxy/image.maple_qr_code?token=one"));
    expect(result.current.entity).toMatchObject({ state: "ready", code: "98668-49366", network: "Maple Guests" });
    act(() => emitEntity("image.maple_qr_code", { attributes: { entity_picture: "/api/image_proxy/image.maple_qr_code?token=two" } }));
    expect(result.current.entity.qr).toBe("http://ha.local:8123/api/image_proxy/image.maple_qr_code?token=two");
  });

  it("keeps the QR code's path relative to the page where the connection has no base URL, as inside Home Assistant", async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useHaGuestWifi("sensor.maple_voucher"), { wrapper });

    await waitFor(() => expect(result.current.entity.qr).toBe("/api/image_proxy/image.maple_qr_code?token=one"));
  });

  it("drops the QR code while its image is unavailable or unknown, and keeps the code", async () => {
    const { wrapper, emitEntity } = setup(undefined, (path) => `http://ha.local${path}`);
    const { result } = renderHook(() => useHaGuestWifi("sensor.maple_voucher"), { wrapper });
    await waitFor(() => expect(result.current.entity.qr).toBeDefined());

    act(() => emitEntity("image.maple_qr_code", { state: "unavailable" }));
    expect(result.current.entity).toMatchObject({ state: "ready", code: "98668-49366" });
    expect(result.current.entity.qr).toBeUndefined();
    act(() => emitEntity("image.maple_qr_code", { state: "unknown" }));
    expect(result.current.entity.qr).toBeUndefined();
    act(() => emitEntity("image.maple_qr_code", { state: stamp }));
    expect(result.current.entity.qr).toBe("http://ha.local/api/image_proxy/image.maple_qr_code?token=one");
  });

  it("draws no QR code while the guest Wi-Fi is unavailable, whatever its image says", async () => {
    const { wrapper, emitEntity } = setup();
    const { result } = renderHook(() => useHaGuestWifi("sensor.maple_voucher"), { wrapper });
    await waitFor(() => expect(result.current.entity.qr).toBeDefined());

    act(() => {
      emitEntity("sensor.maple_voucher", { state: "unavailable" });
      emitEntity("button.maple_create", { state: "unavailable" });
    });
    expect(result.current.entity.state).toBe("unavailable");
    expect(result.current.entity.qr).toBeUndefined();
  });

  it("reads a named QR code's image, and none where there is none to find", async () => {
    const named = setup(undefined, (path) => `https://ha.example${path}`);
    const { result } = renderHook(() => useHaGuestWifi("sensor.maple_voucher", { qrEntityId: "image.elsewhere" }), { wrapper: named.wrapper });
    await waitFor(() => expect(result.current.entity.state).toBe("ready"));
    expect(result.current.entity.qr).toBeUndefined();
    act(() => named.emitEntity("image.elsewhere", { state: stamp, attributes: { entity_picture: "/api/image_proxy/image.elsewhere?token=x" } }));
    expect(result.current.entity.qr).toBe("https://ha.example/api/image_proxy/image.elsewhere?token=x");

    const password = setup();
    act(() => password.emitEntity("input_text.guest_password", { state: "ripe-Mango-sunset-42" }));
    const none = renderHook(() => useHaGuestWifi("input_text.guest_password"), { wrapper: password.wrapper });
    await waitFor(() => expect(none.result.current.entity.state).toBe("ready"));
    expect(none.result.current.entity.qr).toBeUndefined();
  });

  it("keeps the demo transport's inline QR codes, and drops the password's once its script makes it unavailable", async () => {
    const transport = createDemoGuestWifiHaTransport();
    const { wrapper } = setup(transport);
    const voucher = renderHook(() => useHaGuestWifi(GUEST_WIFI_DEMO_ID), { wrapper });
    const password = renderHook(() => useHaGuestWifi(GUEST_WIFI_DEMO_PASSWORD.entityId, { qrEntityId: GUEST_WIFI_DEMO_PASSWORD.qr, newCodeEntityId: GUEST_WIFI_DEMO_PASSWORD.newCode }), { wrapper });

    await waitFor(() => expect(voucher.result.current.entity.qr).toMatch(/^data:image\/svg\+xml,/));
    expect(password.result.current.entity.qr).toMatch(/^data:image\/svg\+xml,/);
    await act(async () => { await password.result.current.actions.onNewCode?.(); });
    expect(password.result.current.entity.state).toBe("ready");
    expect(password.result.current.entity.qr).toBeUndefined();
  });
});

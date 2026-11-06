import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaGuestWifiTile } from "./HaGuestWifiTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const at = "2026-10-19T10:00:00Z";
const raw: HassEntities = {
  "sensor.site_voucher": {
    entity_id: "sensor.site_voucher",
    state: "98668-49366",
    attributes: { friendly_name: "UniFi Hotspot Manager Voucher", wlan_name: "Maple Guests", quota: 1, used: 0, duration: "1 d" },
    last_changed: at,
    last_updated: at,
  },
  "image.site_qr_code": { entity_id: "image.site_qr_code", state: at, attributes: { wlan_name: "Maple Guests", entity_picture: "/api/image_proxy/image.site_qr_code?token=t" }, last_changed: at, last_updated: at },
  "button.site_create": { entity_id: "button.site_create", state: "unknown", attributes: {}, last_changed: at, last_updated: at },
  "button.site_update": { entity_id: "button.site_update", state: "unknown", attributes: {}, last_changed: at, last_updated: at },
};

describe("HaGuestWifiTile", () => {
  it("draws the code and names the network", async () => {
    renderConnected(<HaGuestWifiTile entityId="sensor.site_voucher" />, raw);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Guest Wi-Fi" })).toBeTruthy());
    expect(screen.getByText("Maple Guests")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guest Wi-Fi: code 9 8 6 6 8, 4 9 3 6 6. Open details" })).toBeTruthy();
  });

  it("presses the create button from the sheet for a new code", async () => {
    const { callService } = renderConnected(<HaGuestWifiTile entityId="sensor.site_voucher" defaultOpen />, raw);
    fireEvent.click(await screen.findByRole("button", { name: "Make a new code for Guest Wi-Fi" }));
    await waitFor(() => expect(callService).toHaveBeenCalled());
    expect(callService.mock.calls[0].slice(0, 3)).toEqual(["button", "press", { entity_id: "button.site_create" }]);
  });

  it("draws the join QR code in the sheet", async () => {
    renderConnected(<HaGuestWifiTile entityId="sensor.site_voucher" defaultOpen />, raw);
    expect((await screen.findByRole("img", { name: "QR code to join Maple Guests" })).getAttribute("src")).toBe("/api/image_proxy/image.site_qr_code?token=t");
  });

  it("shows a missing entity with no way to make a code as unavailable", async () => {
    renderConnected(<HaGuestWifiTile entityId="sensor.missing_voucher" />, raw);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

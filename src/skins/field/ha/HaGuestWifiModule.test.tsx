import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaGuestWifiModule } from "./HaGuestWifiModule";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/guestWifi.json";

const at = "2026-10-19T10:00:00Z";
const ID = "sensor.maple_voucher";
const raw: HassEntities = {
  ...(fixture as HassEntities),
  "image.maple_qr_code": { entity_id: "image.maple_qr_code", state: at, attributes: { wlan_name: "Maple Guests", entity_picture: "/api/image_proxy/image.maple_qr_code?token=t" }, last_changed: at, last_updated: at },
  "button.maple_create": { entity_id: "button.maple_create", state: "unknown", attributes: {}, last_changed: at, last_updated: at },
  "button.maple_update": { entity_id: "button.maple_update", state: "unknown", attributes: {}, last_changed: at, last_updated: at },
};

describe("HaGuestWifiModule", () => {
  it("presses the integration's buttons from the panel, and nothing from the module", async () => {
    const live = renderConnected(<HaGuestWifiModule entityId={ID} defaultOpen />, raw);
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("ready"));
    expect(live.container.querySelector(".fd-module .fd-key")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Refresh Guest Wi-Fi's code" }));
    await waitFor(() => expect(live.callService).toHaveBeenCalledTimes(1));
    expect(live.callService.mock.calls[0].slice(0, 3)).toEqual(["button", "press", { entity_id: "button.maple_update" }]);
  });

  it("has no code, and still a new one to make, once the code's sensor goes unavailable", async () => {
    const live = renderConnected(<HaGuestWifiModule entityId={ID} />, raw);
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("none"));
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" }, "button.maple_create": { ...raw["button.maple_create"], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});

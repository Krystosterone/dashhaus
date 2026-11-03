import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaLockTile } from "./HaLockTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const raw: HassEntities = {
  "lock.back_door": {
    entity_id: "lock.back_door",
    state: "unlocked",
    attributes: { friendly_name: "Back door", supported_features: 0 },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
  "lock.front_door": {
    entity_id: "lock.front_door",
    state: "locked",
    attributes: { friendly_name: "Front door", supported_features: 1 },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
  "sensor.front_door_battery": {
    entity_id: "sensor.front_door_battery",
    state: "9",
    attributes: { device_class: "battery", unit_of_measurement: "%" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};

describe("HaLockTile", () => {
  it("locks an unlocked lock through the store on a tap", async () => {
    const fake = renderConnected(<HaLockTile entityId="lock.back_door" />, raw);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Back door" })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Lock Back door" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("lock", "lock", { entity_id: "lock.back_door" });
  });

  it("never unlocks on a tap: it asks in the sheet, with the battery companion composed", async () => {
    const fake = renderConnected(<HaLockTile entityId="lock.front_door" batteryEntityId="sensor.front_door_battery" />, raw);
    await waitFor(() => expect(screen.getAllByText("Battery 9%").length).toBeGreaterThan(0));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unlock Front door…" }));
      await Promise.resolve();
    });
    expect(fake.callService).not.toHaveBeenCalled();
    expect(screen.getByText("Unlock Front door?")).toBeTruthy();
  });

  it("shows a missing entity as unavailable", async () => {
    renderConnected(<HaLockTile entityId="lock.missing" name="Missing" />, raw);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

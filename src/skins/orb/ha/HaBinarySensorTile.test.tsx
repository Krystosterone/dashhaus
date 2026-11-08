import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaBinarySensorTile } from "./HaBinarySensorTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const raw: HassEntities = {
  "binary_sensor.kitchen_leak": {
    entity_id: "binary_sensor.kitchen_leak",
    state: "on",
    attributes: { friendly_name: "Under the sink", device_class: "moisture" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
  "sensor.kitchen_leak_battery": {
    entity_id: "sensor.kitchen_leak_battery",
    state: "8",
    attributes: { device_class: "battery", unit_of_measurement: "%" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};

describe("HaBinarySensorTile", () => {
  it("maps the raw entity into the tile, in its device class's words, with its warning", async () => {
    renderConnected(<HaBinarySensorTile entityId="binary_sensor.kitchen_leak" loadHistory={false} />, raw);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Under the sink" })).toBeTruthy());
    expect(screen.getByRole("button", { name: /^Under the sink: Wet, since .+\. Open details$/ })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Warning: Under the sink: Leak detected" })).toBeTruthy();
  });

  it("passes its device's battery through", async () => {
    renderConnected(<HaBinarySensorTile entityId="binary_sensor.kitchen_leak" batteryEntityId="sensor.kitchen_leak_battery" footprint="compact" loadHistory={false} />, { ...raw, "binary_sensor.kitchen_leak": { ...raw["binary_sensor.kitchen_leak"], state: "off" } });
    await waitFor(() => expect(screen.getAllByText("Battery 8%").length).toBeGreaterThan(0));
  });

  it("shows a missing entity as unavailable", async () => {
    renderConnected(<HaBinarySensorTile entityId="binary_sensor.missing" name="Missing" />, raw);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaNumericTile } from "./HaNumericTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const raw: HassEntities = {
  "sensor.living_room_co2": {
    entity_id: "sensor.living_room_co2",
    state: "650",
    attributes: { friendly_name: "Living room CO₂", unit_of_measurement: "ppm", device_class: "carbon_dioxide", state_class: "measurement" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};

describe("HaNumericTile", () => {
  it("maps the raw entity into the tile, what it measures included", async () => {
    const { container } = renderConnected(<HaNumericTile entityId="sensor.living_room_co2" area="Living room" loadHistory={false} />, raw);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Living room CO₂" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Living room CO₂: 650 ppm. Open details" })).toBeTruthy();
    expect(container.querySelector(".hd-area")?.textContent).toBe("Living room · CO₂");
  });

  it("lets the host's unit stand in for a missing one", async () => {
    const bare = { "sensor.count": { ...raw["sensor.living_room_co2"], entity_id: "sensor.count", attributes: { friendly_name: "Count" } } };
    renderConnected(<HaNumericTile entityId="sensor.count" unit="pages" loadHistory={false} />, bare);
    await waitFor(() => expect(screen.getByRole("button", { name: "Count: 650 pages. Open details" })).toBeTruthy());
  });

  it("shows a missing entity as unavailable", async () => {
    renderConnected(<HaNumericTile entityId="sensor.missing" name="Missing" />, raw);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

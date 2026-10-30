import { act, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaSensorTile } from "./HaSensorTile";
import type { HassEntities } from "@scope/core";
import { renderConnected } from "@scope/core/testing";

const raw: HassEntities = {
  "sensor.living_room_temperature": {
    entity_id: "sensor.living_room_temperature",
    state: "21.4",
    attributes: {
      friendly_name: "Living room",
      device_class: "temperature",
      unit_of_measurement: "°C",
    },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
  "sensor.living_room_humidity": {
    entity_id: "sensor.living_room_humidity",
    state: "44",
    attributes: { device_class: "humidity", unit_of_measurement: "%" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
  "sensor.living_room_battery": {
    entity_id: "sensor.living_room_battery",
    state: "82",
    attributes: { device_class: "battery", unit_of_measurement: "%" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};


describe("HaSensorTile", () => {
  it("maps companion raw entities into the existing SensorTile", async () => {
    const fake = renderConnected(
      <HaSensorTile
        entityId="sensor.living_room_temperature"
        humidityEntityId="sensor.living_room_humidity"
        batteryEntityId="sensor.living_room_battery"
      />,
      raw,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Living room" })).toBeTruthy());
    expect(screen.getByRole("button", { name: /21\.4 degrees, humidity 44 percent/ })).toBeTruthy();
    act(() => fake.emit({ ...raw, "sensor.living_room_temperature": { ...raw["sensor.living_room_temperature"], state: "unavailable" } }));
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

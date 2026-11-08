import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaDysonTile } from "./HaDysonTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const at = "2026-10-19T10:00:00Z";
const raw: HassEntities = {
  "fan.bedroom": {
    entity_id: "fan.bedroom",
    state: "on",
    attributes: { friendly_name: "Purifier", percentage: 40, percentage_step: 10, preset_mode: "Normal", preset_modes: ["Auto", "Normal"], oscillating: false, direction: "forward", supported_features: 63 },
    last_changed: at,
    last_updated: at,
  },
  "sensor.bedroom_pm_2_5": { entity_id: "sensor.bedroom_pm_2_5", state: "62", attributes: { unit_of_measurement: "µg/m³" }, last_changed: at, last_updated: at },
  "switch.bedroom_night_mode": { entity_id: "switch.bedroom_night_mode", state: "off", attributes: {}, last_changed: at, last_updated: at },
};

describe("HaDysonTile", () => {
  it("composes the companions beside the fan and routes the orb through the store", async () => {
    const fake = renderConnected(<HaDysonTile entityId="fan.bedroom" />, raw);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Purifier" })).toBeTruthy());
    expect(screen.getByText("Poor air")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Purifier" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("fan", "toggle", { entity_id: "fan.bedroom" });
  });

  it("switches a companion on its own entity, from the sheet", async () => {
    const fake = renderConnected(<HaDysonTile entityId="fan.bedroom" defaultOpen />, raw);
    const night = await screen.findByRole("group", { name: "Night mode" });
    await act(async () => {
      fireEvent.click(within(night).getByRole("button", { name: "On" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("switch", "turn_on", { entity_id: "switch.bedroom_night_mode" });
  });

  it("takes a companion named otherwise", async () => {
    renderConnected(<HaDysonTile entityId="fan.bedroom" companions={{ pm25: "sensor.elsewhere" }} />, {
      ...raw,
      "sensor.elsewhere": { entity_id: "sensor.elsewhere", state: "4", attributes: { unit_of_measurement: "µg/m³" }, last_changed: at, last_updated: at },
    });
    await waitFor(() => expect(screen.getByRole("heading", { name: "Purifier" })).toBeTruthy());
    expect(screen.queryByText("Poor air")).toBeNull();
  });

  it("shows a missing entity as unavailable", async () => {
    renderConnected(<HaDysonTile entityId="fan.missing" name="Missing" />, raw);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

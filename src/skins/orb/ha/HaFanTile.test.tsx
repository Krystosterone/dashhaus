import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaFanTile } from "./HaFanTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const raw: HassEntities = {
  "fan.bedroom": {
    entity_id: "fan.bedroom",
    state: "on",
    attributes: { friendly_name: "Bedroom", percentage: 67, percentage_step: 100 / 3, supported_features: 1 | 16 | 32 },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};

describe("HaFanTile", () => {
  it("maps the raw entity into the tile and routes the orb through the store", async () => {
    const fake = renderConnected(<HaFanTile entityId="fan.bedroom" />, raw);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Bedroom" })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bedroom" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("fan", "toggle", { entity_id: "fan.bedroom" });
  });

  it("sends the groove's speed as the percentage Home Assistant takes", async () => {
    const fake = renderConnected(<HaFanTile entityId="fan.bedroom" />, raw);
    const groove = await screen.findByRole("slider", { name: "Bedroom speed" });
    expect(groove.getAttribute("aria-valuetext")).toBe("Speed 2 of 3");
    await act(async () => {
      fireEvent.keyDown(groove, { key: "ArrowLeft" });
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("fan", "set_percentage", { entity_id: "fan.bedroom", percentage: 33 });
  });

  it("shows a missing entity as unavailable", async () => {
    renderConnected(<HaFanTile entityId="fan.missing" name="Missing" />, raw);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

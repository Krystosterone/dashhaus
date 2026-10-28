import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaHumidifierTile } from "./HaHumidifierTile";
import type { HassEntities } from "../../../ha/types";
import { renderConnected } from "../../../ha/testing";

const raw: HassEntities = {
  "humidifier.bedroom": {
    entity_id: "humidifier.bedroom",
    state: "on",
    attributes: { friendly_name: "Bedroom" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};


describe("HaHumidifierTile", () => {
  it("maps the raw entity into the tile and routes the orb through the store", async () => {
    const fake = renderConnected(<HaHumidifierTile entityId="humidifier.bedroom" />, raw);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Bedroom" })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bedroom" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("humidifier", "toggle", { entity_id: "humidifier.bedroom" });
  });

  it("shows a missing entity as unavailable", async () => {
    renderConnected(<HaHumidifierTile entityId="humidifier.missing" name="Missing" />, raw);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

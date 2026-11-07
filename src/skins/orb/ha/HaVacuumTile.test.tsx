import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaVacuumTile } from "./HaVacuumTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const raw: HassEntities = {
  "vacuum.downstairs": {
    entity_id: "vacuum.downstairs",
    state: "cleaning",
    attributes: { friendly_name: "Robot vacuum", battery_level: 72, supported_features: 4 | 16 | 8192 },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};

describe("HaVacuumTile", () => {
  it("maps the raw entity into the tile and routes the orb through the store", async () => {
    const fake = renderConnected(<HaVacuumTile entityId="vacuum.downstairs" />, raw);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Robot vacuum" })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Pause Robot vacuum" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("vacuum", "pause", { entity_id: "vacuum.downstairs" });
  });

  it("shows a missing entity as unavailable", async () => {
    renderConnected(<HaVacuumTile entityId="vacuum.missing" name="Missing" />, raw);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

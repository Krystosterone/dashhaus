import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Ha__Name__Tile } from "./Ha__Name__Tile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const raw: HassEntities = {
  "__domain__.bedroom": {
    entity_id: "__domain__.bedroom",
    state: "on",
    attributes: { friendly_name: "Bedroom" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};

describe("Ha__Name__Tile", () => {
  it("maps the raw entity into the tile and routes the orb through the store", async () => {
    const fake = renderConnected(<Ha__Name__Tile entityId="__domain__.bedroom" />, raw);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Bedroom" })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bedroom" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("__domain__", "toggle", { entity_id: "__domain__.bedroom" });
  });

  it("shows a missing entity as unavailable", async () => {
    renderConnected(<Ha__Name__Tile entityId="__domain__.missing" name="Missing" />, raw);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

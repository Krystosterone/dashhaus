import { act, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaCoverTile } from "./HaCoverTile";
import type { HassEntities } from "@scope/core";
import { renderConnected } from "@scope/core/testing";

const raw: HassEntities = {
  "cover.living_room": {
    entity_id: "cover.living_room",
    state: "open",
    attributes: {
      friendly_name: "Living room blinds",
      device_class: "blind",
      current_position: 100,
      current_tilt_position: 50,
      supported_features: 4 | 8 | 16,
    },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};


describe("HaCoverTile", () => {
  it("maps a raw cover entity into the existing CoverTile", async () => {
    const fake = renderConnected(<HaCoverTile entityId="cover.living_room" />, raw);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Living room blinds" })).toBeTruthy());
    act(() => fake.emit({ ...raw, "cover.living_room": { ...raw["cover.living_room"], state: "unavailable" } }));
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

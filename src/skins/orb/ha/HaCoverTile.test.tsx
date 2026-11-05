import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaCoverTile } from "./HaCoverTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

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

  it("drives a cover Home Assistant reports as unknown: Close and Open both reach the store", async () => {
    // A Somfy RTS blind on an assumed state: open, close and stop, and never a position.
    const rts: HassEntities = {
      "cover.rts": {
        entity_id: "cover.rts",
        state: "unknown",
        attributes: { friendly_name: "RTS blind", device_class: "blind", assumed_state: true, supported_features: 1 | 2 | 8 },
        last_changed: "2026-10-19T10:00:00Z",
        last_updated: "2026-10-19T10:00:00Z",
      },
    };
    const fake = renderConnected(<HaCoverTile entityId="cover.rts" />, rts);

    await waitFor(() => expect(screen.getByRole("heading", { name: "RTS blind" })).toBeTruthy());
    expect(screen.queryByText("Unavailable")).toBeNull();
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    for (const name of ["Close RTS blind", "Open RTS blind"]) {
      const button = screen.getByRole("button", { name });
      expect((button as HTMLButtonElement).disabled).toBe(false);
      await act(async () => {
        fireEvent.click(button);
        await Promise.resolve();
      });
    }
    expect(fake.callService.mock.calls.map(([domain, service]) => `${domain}.${service}`)).toEqual(["cover.close_cover", "cover.open_cover"]);
  });
});

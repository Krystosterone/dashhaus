import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaMediaPlayerTile } from "./HaMediaPlayerTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const raw: HassEntities = {
  "media_player.kitchen": {
    entity_id: "media_player.kitchen",
    state: "playing",
    attributes: {
      friendly_name: "Kitchen speaker", media_title: "Sunday Morning", media_artist: "Maroon 5", media_duration: 245, media_position: 83,
      media_position_updated_at: "2026-10-19T11:53:30Z", entity_picture: "/api/media_player_proxy/media_player.kitchen?token=a", supported_features: 1 | 16384,
    },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};

describe("HaMediaPlayerTile", () => {
  it("maps the raw entity into the tile and routes the pill through the store", async () => {
    const fake = renderConnected(<HaMediaPlayerTile entityId="media_player.kitchen" />, raw);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Kitchen speaker" })).toBeTruthy());
    expect(screen.getByText("Sunday Morning · Maroon 5")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Pause Kitchen speaker" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("media_player", "media_pause", { entity_id: "media_player.kitchen" });
  });

  it("draws its artwork's well when featured", async () => {
    renderConnected(<HaMediaPlayerTile entityId="media_player.kitchen" footprint="featured" />, raw);
    await waitFor(() => expect(screen.getByRole("img", { name: "Artwork for Sunday Morning" })).toBeTruthy());
  });

  it("draws no artwork while off, whatever the attribute still says", async () => {
    const off = { "media_player.kitchen": { ...raw["media_player.kitchen"], state: "off" } };
    renderConnected(<HaMediaPlayerTile entityId="media_player.kitchen" footprint="featured" />, off);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Kitchen speaker" })).toBeTruthy());
    expect(screen.queryByRole("img", { name: /Artwork/ })).toBeNull();
  });

  it("shows a missing entity as unavailable", async () => {
    renderConnected(<HaMediaPlayerTile entityId="media_player.missing" name="Missing" />, raw);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

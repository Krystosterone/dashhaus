import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaMediaPlayerTile } from "./HaMediaPlayerTile";
import { HaProvider, createHaStore } from "@dashhaus/core";
import type { HassEntities } from "@dashhaus/core";
import { fakeTransport, renderConnected } from "@dashhaus/core/testing";

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

  it("seeks once, through the store, when the sheet's groove is let go after several steps", async () => {
    const seekable = { "media_player.kitchen": { ...raw["media_player.kitchen"], attributes: { ...raw["media_player.kitchen"].attributes, supported_features: 1 | 2 | 16384 } } };
    const fake = renderConnected(<HaMediaPlayerTile entityId="media_player.kitchen" defaultOpen />, seekable);
    const groove = await screen.findByRole("slider", { name: "Kitchen speaker position" });
    fireEvent.keyDown(groove, { key: "ArrowLeft" });
    fireEvent.keyDown(groove, { key: "ArrowLeft" });
    expect(fake.callService).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.keyUp(groove, { key: "ArrowLeft" });
      await Promise.resolve();
    });
    // Reported long ago and playing, it is at its end: two steps back is 10 seconds before it.
    expect(fake.callService.mock.calls).toEqual([["media_player", "media_seek", { entity_id: "media_player.kitchen", seek_position: 235 }]]);
  });

  it("steps the volume of a player that can't set it, one volume_down per tap, through the store", async () => {
    const tv = { "media_player.kitchen": { ...raw["media_player.kitchen"], state: "on", attributes: { friendly_name: "Kitchen speaker", supported_features: 8 | 256 | 1024 } } };
    const fake = renderConnected(<HaMediaPlayerTile entityId="media_player.kitchen" defaultOpen />, tv);
    const down = await screen.findByRole("button", { name: "Kitchen speaker: volume down" });
    await act(async () => {
      fireEvent.click(down);
      await Promise.resolve();
    });
    expect(fake.callService.mock.calls).toEqual([["media_player", "volume_down", { entity_id: "media_player.kitchen" }]]);
  });

  it("opens Home Assistant's own player from its sheet's last pill, where the host has one", async () => {
    const moreInfo = vi.fn();
    render(<HaProvider store={createHaStore(fakeTransport(raw).transport)} moreInfo={moreInfo}><HaMediaPlayerTile entityId="media_player.kitchen" loadHistory={false} defaultOpen /></HaProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Open Kitchen speaker in Home Assistant" }));
    expect(moreInfo).toHaveBeenCalledWith("media_player.kitchen");
  });

  it("draws no pill to Home Assistant's player where the host has none", async () => {
    renderConnected(<HaMediaPlayerTile entityId="media_player.kitchen" loadHistory={false} defaultOpen />, raw);
    await waitFor(() => expect(screen.getAllByRole("heading", { name: "Kitchen speaker" }).length).toBeGreaterThan(0));
    expect(screen.queryByRole("button", { name: "Open Kitchen speaker in Home Assistant" })).toBeNull();
  });

  it("shows a missing entity as unavailable", async () => {
    renderConnected(<HaMediaPlayerTile entityId="media_player.missing" name="Missing" />, raw);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

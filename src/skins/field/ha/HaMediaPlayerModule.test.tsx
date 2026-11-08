import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaMediaPlayerModule } from "./HaMediaPlayerModule";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/mediaPlayer.json";

const raw = fixture as HassEntities;
const ID = "media_player.kitchen";
const renderLive = () => renderConnected(<HaMediaPlayerModule entityId={ID} loadHistory={false} />, raw);

describe("HaMediaPlayerModule", () => {
  it("sends its keys' presses to Home Assistant: pause, then next", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("playing"));
    const keys = [...live.container.querySelectorAll<HTMLButtonElement>(".fd-module .fd-key")];
    const before = live.callService.mock.calls.length;
    await act(async () => {
      for (const key of keys) fireEvent.click(key);
      await Promise.resolve();
    });
    expect(live.callService.mock.calls.slice(before).map((call) => call.slice(0, 2))).toEqual([["media_player", "media_pause"], ["media_player", "media_next_track"]]);
  });

  it("seeks once, through the store, when the panel's position fader is let go after several steps", async () => {
    const live = renderConnected(<HaMediaPlayerModule entityId={ID} loadHistory={false} defaultOpen />, raw);
    const fader = await screen.findByRole("slider", { name: "Kitchen speaker position", hidden: true });
    const before = live.callService.mock.calls.length;
    fireEvent.keyDown(fader, { key: "ArrowLeft" });
    fireEvent.keyDown(fader, { key: "ArrowLeft" });
    expect(live.callService.mock.calls.length).toBe(before);
    await act(async () => {
      fireEvent.keyUp(fader, { key: "ArrowLeft" });
      await Promise.resolve();
    });
    // Reported long ago and playing, it is at its end: two steps back is 10 seconds before it.
    expect(live.callService.mock.calls.slice(before)).toEqual([["media_player", "media_seek", { entity_id: ID, seek_position: 235 }]]);
  });

  it("steps the volume of a TV that can't set it, one volume_up per tap, through the store", async () => {
    const TV = "media_player.living_room_tv";
    const live = renderConnected(<HaMediaPlayerModule entityId={TV} loadHistory={false} defaultOpen />, { ...raw, [TV]: { ...raw[TV], state: "on" } });
    const up = await screen.findByRole("button", { name: "Living room TV: volume up" });
    const before = live.callService.mock.calls.length;
    await act(async () => {
      fireEvent.click(up);
      await Promise.resolve();
    });
    expect(live.callService.mock.calls.slice(before)).toEqual([["media_player", "volume_up", { entity_id: TV }]]);
  });

  it("draws its artwork in the screen", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module .fd-pic")).not.toBeNull());
  });

  it("follows the store when the entity stops responding", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
    expect(live.container.querySelector(".fd-module .fd-pic")).toBeNull();
  });
});

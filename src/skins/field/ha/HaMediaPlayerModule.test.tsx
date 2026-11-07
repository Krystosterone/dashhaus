import { act, fireEvent, waitFor } from "@testing-library/react";
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

import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaCoverModule } from "./HaCoverModule";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/cover.json";

const raw = fixture as HassEntities;
const ID = "cover.living_room";
const renderLive = () => renderConnected(<HaCoverModule entityId={ID} loadHistory={false} />, raw);

describe("HaCoverModule", () => {
  it("sends each of its keys' presses to Home Assistant (a reading has none, so its presses call nothing)", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).not.toBe("unavailable"));
    const keys = [...live.container.querySelectorAll<HTMLButtonElement>(".fd-key")];
    // Some hooks read through Home Assistant as they mount (weather's forecasts); count only what the presses send.
    const before = live.callService.mock.calls.length;
    await act(async () => {
      for (const key of keys) fireEvent.click(key);
      await Promise.resolve();
    });
    expect(live.callService.mock.calls.length - before).toBe(keys.length);
  });

  it("sends the position fader and the panel's quick positions and slats through native cover services", async () => {
    const live = renderConnected(<HaCoverModule entityId={ID} loadHistory={false} defaultOpen />, raw);
    await waitFor(() => expect(screen.getAllByRole("slider", { name: "Living room blinds position", hidden: true }).length).toBeGreaterThan(0));
    await act(async () => {
      fireEvent.change(screen.getAllByRole("slider", { name: "Living room blinds position", hidden: true })[0], { target: { value: "40" } });
      fireEvent.click(screen.getByRole("button", { name: "Half open", hidden: true }));
      fireEvent.change(screen.getByRole("slider", { name: "Living room blinds slats", hidden: true }), { target: { value: "80" } });
      await Promise.resolve();
    });
    expect(live.callService).toHaveBeenCalledWith("cover", "set_cover_position", { entity_id: ID, position: 40 });
    expect(live.callService).toHaveBeenCalledWith("cover", "set_cover_position", { entity_id: ID, position: 50 });
    expect(live.callService).toHaveBeenCalledWith("cover", "set_cover_tilt_position", { entity_id: ID, tilt_position: 80 });
  });

  it("follows the store when the entity stops responding", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});

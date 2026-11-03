import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaFanModule } from "./HaFanModule";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/fan.json";

const raw = fixture as HassEntities;
const ID = "fan.bedroom";
const renderLive = () => renderConnected(<HaFanModule entityId={ID} loadHistory={false} />, raw);

describe("HaFanModule", () => {
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

  it("sends the fader's speed as the percentage Home Assistant takes", async () => {
    const live = renderLive();
    const fader = await screen.findByRole("slider", { name: "Bedroom speed" });
    expect(fader.getAttribute("aria-valuetext")).toBe("Speed 2 of 3");
    await act(async () => {
      fireEvent.keyDown(fader, { key: "ArrowLeft" });
      await Promise.resolve();
    });
    expect(live.callService).toHaveBeenCalledWith("fan", "set_percentage", { entity_id: ID, percentage: 33 });
  });

  it("follows the store when the entity stops responding", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});

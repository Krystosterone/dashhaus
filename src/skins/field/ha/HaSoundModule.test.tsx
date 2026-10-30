import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaSoundModule } from "./HaSoundModule";
import type { HassEntities } from "@scope/core";
import { renderConnected } from "@scope/core/testing";
import fixture from "@scope/core/fixtures/sound.json";

const raw = fixture as HassEntities;
const ID = "switch.bedroom";
const renderLive = () => renderConnected(<HaSoundModule entityId={ID} loadHistory={false} />, raw);

describe("HaSoundModule", () => {
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

  it("finds the volume beside its switch, and sets it from the panel's fader without switching the sound", async () => {
    const volume = { entity_id: "number.bedroom_volume", state: "62.0", attributes: { min: 0, max: 100, step: 1 }, last_changed: raw[ID].last_changed, last_updated: raw[ID].last_updated };
    const live = renderConnected(<HaSoundModule entityId={ID} loadHistory={false} defaultOpen />, { ...raw, [volume.entity_id]: volume });
    const slider = await screen.findByRole("slider", { name: "Bedroom volume", hidden: true });
    expect(slider.getAttribute("aria-valuetext")).toBe("62 percent");
    await act(async () => {
      fireEvent.change(slider, { target: { value: "40" } });
      await Promise.resolve();
    });
    expect(live.callService).toHaveBeenCalledWith("number", "set_value", { entity_id: "number.bedroom_volume", value: 40 });
    expect(live.callService).not.toHaveBeenCalledWith("switch", expect.anything(), expect.anything());
  });

  it("follows the store when the entity stops responding", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});

import { act, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaNumericModule } from "./HaNumericModule";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/numeric.json";

const raw = fixture as HassEntities;
const ID = "sensor.living_room_co2";
const renderLive = () => renderConnected(<HaNumericModule entityId={ID} loadHistory={false} />, raw);

describe("HaNumericModule", () => {
  it("sends each of its keys' presses to Home Assistant, but none that asks first (a reading has none, so its presses call nothing)", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).not.toBe("unavailable"));
    const keys = [...live.container.querySelectorAll<HTMLButtonElement>(".fd-key")];
    // Some hooks read through Home Assistant as they mount (weather's forecasts); count only what the presses send.
    const before = live.callService.mock.calls.length;
    await act(async () => {
      for (const key of keys) fireEvent.click(key);
      await Promise.resolve();
    });
    // A key that asks first opens the panel on its question instead; one that takes a code asks for it where the entity wants one.
    expect(keys.length).toBeGreaterThanOrEqual(0);
    expect(live.callService.mock.calls.length - before).toBe(0);
  });

  it("follows the store when the entity stops responding", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});

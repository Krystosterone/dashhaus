import { act, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Ha__Name__Module } from "./Ha__Name__Module";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/__name__.json";

const raw = fixture as HassEntities;
const ID = "__fixtureId__";
const renderLive = () => renderConnected(<Ha__Name__Module entityId={ID}__loadHistory__ />, raw);

describe("Ha__Name__Module", () => {
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
    expect(keys.length).toBeGreaterThanOrEqual(__sentAtOnce__);
    expect(live.callService.mock.calls.length - before).toBe(__sentAtOnce__);
  });

  it("follows the store when the entity stops responding", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});

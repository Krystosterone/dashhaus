import { act, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaDysonModule } from "./HaDysonModule";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";
import fixture from "@dashhaus/core/fixtures/dyson.json";

const raw = fixture as HassEntities;
const ID = "fan.bedroom_purifier";
const renderLive = () => renderConnected(<HaDysonModule entityId={ID} />, raw);

describe("HaDysonModule", () => {
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
    expect(keys.length).toBeGreaterThanOrEqual(1);
    expect(live.callService.mock.calls.length - before).toBe(1);
  });

  it("follows the store when the entity stops responding", async () => {
    const live = renderLive();
    await waitFor(() => expect(live.container.querySelector(".fd-module")).not.toBeNull());
    act(() => live.emit({ ...raw, [ID]: { ...raw[ID], state: "unavailable" } }));
    await waitFor(() => expect(live.container.querySelector(".fd-module")?.getAttribute("data-state")).toBe("unavailable"));
  });
});

describe("HaDysonModule's companions", () => {
  it("switches night mode on its own switch, from the panel", async () => {
    const at = "2026-10-19T10:00:00Z";
    const live = renderConnected(<HaDysonModule entityId={ID} defaultOpen />, {
      ...raw,
      "switch.bedroom_purifier_night_mode": { entity_id: "switch.bedroom_purifier_night_mode", state: "off", attributes: {}, last_changed: at, last_updated: at },
    });
    const key = await waitFor(() => {
      const found = [...document.querySelectorAll<HTMLButtonElement>(".fd-key")].find((k) => k.getAttribute("aria-label") === "Night mode");
      expect(found).toBeTruthy();
      return found!;
    });
    await act(async () => {
      fireEvent.click(key);
      await Promise.resolve();
    });
    expect(live.callService).toHaveBeenCalledWith("switch", "turn_on", { entity_id: "switch.bedroom_purifier_night_mode" });
  });
});

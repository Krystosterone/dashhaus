import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SETTLE_MS } from "@dashhaus/core/hooks";
import { HaCoverTile } from "./HaCoverTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

const raw: HassEntities = {
  "cover.living_room": {
    entity_id: "cover.living_room",
    state: "open",
    attributes: {
      friendly_name: "Living room blinds",
      device_class: "blind",
      current_position: 100,
      current_tilt_position: 50,
      supported_features: 4 | 8 | 16,
    },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};


afterEach(() => { vi.useRealTimers(); });

describe("HaCoverTile", () => {
  it("maps a raw cover entity into the existing CoverTile", async () => {
    const fake = renderConnected(<HaCoverTile entityId="cover.living_room" />, raw);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Living room blinds" })).toBeTruthy());
    act(() => fake.emit({ ...raw, "cover.living_room": { ...raw["cover.living_room"], state: "unavailable" } }));
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });

  it("drives a cover Home Assistant reports as unknown: Close and Open both reach the store", async () => {
    // A Somfy RTS blind on an assumed state: open, close and stop, and never a position.
    const rts: HassEntities = {
      "cover.rts": {
        entity_id: "cover.rts",
        state: "unknown",
        attributes: { friendly_name: "RTS blind", device_class: "blind", assumed_state: true, supported_features: 1 | 2 | 8 },
        last_changed: "2026-10-19T10:00:00Z",
        last_updated: "2026-10-19T10:00:00Z",
      },
    };
    const fake = renderConnected(<HaCoverTile entityId="cover.rts" />, rts);

    await waitFor(() => expect(screen.getByRole("heading", { name: "RTS blind" })).toBeTruthy());
    expect(screen.queryByText("Unavailable")).toBeNull();
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    for (const name of ["Close RTS blind", "Open RTS blind"]) {
      const button = screen.getByRole("button", { name });
      expect((button as HTMLButtonElement).disabled).toBe(false);
      await act(async () => {
        fireEvent.click(button);
        await Promise.resolve();
      });
    }
    expect(fake.callService.mock.calls.map(([domain, service]) => `${domain}.${service}`)).toEqual(["cover.close_cover", "cover.open_cover"]);
  });

  it("drives an unknown garage door through the question: Close and Open each ask in the sheet, and reach the store once answered", async () => {
    // A garage door with no position sensor, on an assumed state: both ends act, and each asks first.
    const door: HassEntities = {
      "cover.garage": {
        entity_id: "cover.garage",
        state: "unknown",
        attributes: { friendly_name: "Garage door", device_class: "garage", assumed_state: true, supported_features: 1 | 2 | 8 },
        last_changed: "2026-10-19T10:00:00Z",
        last_updated: "2026-10-19T10:00:00Z",
      },
    };
    const fake = renderConnected(<HaCoverTile entityId="cover.garage" />, door);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Garage door" })).toBeTruthy());
    vi.useFakeTimers();
    for (const [end, yes] of [["Close Garage door…", "Close garage door"], ["Open Garage door…", "Open garage door"]]) {
      const ends = screen.getAllByRole("group", { name: "Garage door" })[0];
      act(() => { fireEvent.click(ends.querySelector<HTMLButtonElement>(`[aria-label="${end}"]`)!); });
      expect(fake.callService.mock.calls.length, "a tap asks first: nothing is sent").toBe(yes.startsWith("Close") ? 0 : 1);
      act(() => { vi.advanceTimersByTime(SETTLE_MS); });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: yes, hidden: true }));
        await Promise.resolve();
      });
    }
    expect(fake.callService.mock.calls.map(([domain, service]) => `${domain}.${service}`)).toEqual(["cover.close_cover", "cover.open_cover"]);
  });

  it("asks before a template gate the YAML names a gate moves to a position, and sets it once answered", async () => {
    // Home Assistant gives it no device_class; the card's `device_class: gate` makes it one, so its bar asks first.
    const gate: HassEntities = {
      "cover.template_gate": {
        entity_id: "cover.template_gate",
        state: "closed",
        attributes: { friendly_name: "Front gate", current_position: 0, supported_features: 1 | 2 | 4 | 8 },
        last_changed: "2026-10-19T10:00:00Z",
        last_updated: "2026-10-19T10:00:00Z",
      },
    };
    const fake = renderConnected(<HaCoverTile entityId="cover.template_gate" deviceClass="gate" />, gate);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Front gate" })).toBeTruthy());
    vi.useFakeTimers();
    const bar = document.querySelector<HTMLElement>(".cv-bar")!;
    Object.defineProperty(bar, "getBoundingClientRect", { value: () => ({ left: 0, width: 100 }) });
    Object.defineProperty(Element.prototype, "setPointerCapture", { value: vi.fn(), configurable: true });
    const at = (type: string, x: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, button: 0 });
      Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: "mouse" } });
      fireEvent(bar.querySelector(".hd-track-hit")!, event);
    };
    act(() => { at("pointerdown", 40); at("pointerup", 40); });
    expect(screen.getByText("Move Front gate to 40%?")).toBeTruthy();
    expect(fake.callService, "a tap asks first: nothing is sent").not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(SETTLE_MS); });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Move to 40%", hidden: true }));
      await Promise.resolve();
    });
    expect(fake.callService.mock.calls.map(([domain, service, data]) => [`${domain}.${service}`, data])).toEqual([["cover.set_cover_position", expect.objectContaining({ position: 40 })]]);
  });
});

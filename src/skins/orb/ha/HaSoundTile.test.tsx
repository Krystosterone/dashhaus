import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaSoundTile } from "./HaSoundTile";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import type { HaTransport, HassEntities } from "../../../ha/types";

const raw: HassEntities = {
  "switch.bedroom": {
    entity_id: "switch.bedroom",
    state: "on",
    attributes: { friendly_name: "Bedroom" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
  "switch.nursery_music": {
    entity_id: "switch.nursery_music",
    state: "on",
    attributes: { friendly_name: "Chambre Nova Music", icon: "mdi:music" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
  "number.nursery_volume": {
    entity_id: "number.nursery_volume",
    state: "62.0",
    attributes: { friendly_name: "Chambre Nova Volume", min: 0, max: 100, step: 1, mode: "auto" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};

function transport() {
  const callService = vi.fn(async () => undefined);
  const value: HaTransport = {
    subscribeEntities(next) {
      queueMicrotask(() => next(raw));
      return () => {};
    },
    callService,
  };
  return { value, callService };
}

describe("HaSoundTile", () => {
  it("maps the raw entity into the tile and routes the orb through the store", async () => {
    const fake = transport();
    render(
      <HaProvider store={createHaStore(fake.value)}>
        <HaSoundTile entityId="switch.bedroom" />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Bedroom" })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bedroom" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("switch", "toggle", { entity_id: "switch.bedroom" });
  });

  it("shows a missing entity as unavailable", async () => {
    const fake = transport();
    render(
      <HaProvider store={createHaStore(fake.value)}>
        <HaSoundTile entityId="switch.missing" name="Missing" />
      </HaProvider>,
    );
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });

  it("finds the volume beside its device and sets it from the sheet", async () => {
    const fake = transport();
    render(
      <HaProvider store={createHaStore(fake.value)}>
        <HaSoundTile entityId="switch.nursery_music" name="White noise" defaultOpen loadHistory={false} />
      </HaProvider>,
    );

    const slider = await screen.findByRole("slider", { name: "Volume" });
    expect(slider.getAttribute("aria-valuetext")).toBe("62 percent");
    await act(async () => {
      fireEvent.change(slider, { target: { value: "40" } });
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("number", "set_value", { entity_id: "number.nursery_volume", value: 40 });
  });
});

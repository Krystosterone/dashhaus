import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Ha__Name__Tile } from "./Ha__Name__Tile";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import type { HaTransport, HassEntities } from "./types";

const raw: HassEntities = {
  "__domain__.bedroom": {
    entity_id: "__domain__.bedroom",
    state: "on",
    attributes: { friendly_name: "Bedroom" },
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

describe("Ha__Name__Tile", () => {
  it("maps the raw entity into the tile and routes the orb through the store", async () => {
    const fake = transport();
    render(
      <HaProvider store={createHaStore(fake.value)}>
        <Ha__Name__Tile entityId="__domain__.bedroom" />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Bedroom" })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bedroom" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("__domain__", "toggle", { entity_id: "__domain__.bedroom" });
  });

  it("shows a missing entity as unavailable", async () => {
    const fake = transport();
    render(
      <HaProvider store={createHaStore(fake.value)}>
        <Ha__Name__Tile entityId="__domain__.missing" name="Missing" />
      </HaProvider>,
    );
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

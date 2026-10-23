import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Ha__Name__Tile } from "./Ha__Name__Tile";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import type { HaTransport, HassEntities } from "./types";

const raw: HassEntities = {
  "__domain__.living_room": {
    entity_id: "__domain__.living_room",
    state: "42",
    attributes: { friendly_name: "Living room", unit_of_measurement: "ppm" },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};

function store() {
  const transport: HaTransport = {
    subscribeEntities(next) {
      queueMicrotask(() => next(raw));
      return () => {};
    },
    callService: async () => undefined,
  };
  return createHaStore(transport);
}

describe("Ha__Name__Tile", () => {
  it("maps the raw entity into the tile", async () => {
    render(<HaProvider store={store()}><Ha__Name__Tile entityId="__domain__.living_room" /></HaProvider>);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Living room" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Living room: 42 ppm. Open details" })).toBeTruthy();
  });

  it("shows a missing entity as unavailable", async () => {
    render(<HaProvider store={store()}><Ha__Name__Tile entityId="__domain__.missing" name="Missing" /></HaProvider>);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

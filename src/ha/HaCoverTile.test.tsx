import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaCoverTile } from "./HaCoverTile";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import type { HaTransport, HassEntities } from "./types";

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

function transport() {
  let listener: ((entities: HassEntities) => void) | undefined;
  const value: HaTransport = {
    subscribeEntities(next) {
      listener = next;
      queueMicrotask(() => next(raw));
      return () => { listener = undefined; };
    },
    callService: async () => undefined,
  };
  return { value, emit: (entities: HassEntities) => listener?.(entities) };
}

describe("HaCoverTile", () => {
  it("maps a raw cover entity into the existing CoverTile", async () => {
    const fake = transport();
    const store = createHaStore(fake.value);
    render(
      <HaProvider store={store}>
        <HaCoverTile entityId="cover.living_room" />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Living room blinds" })).toBeTruthy());
    act(() => fake.emit({ ...raw, "cover.living_room": { ...raw["cover.living_room"], state: "unavailable" } }));
    await waitFor(() => expect(screen.getByText("Not responding")).toBeTruthy());
  });
});

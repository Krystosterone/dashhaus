import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaLightTile } from "./HaLightTile";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import type { HaTransport, HassEntities } from "../../../ha/types";

const raw: HassEntities = {
  "light.living_room": {
    entity_id: "light.living_room",
    state: "on",
    attributes: {
      friendly_name: "Living room",
      supported_color_modes: ["color_temp", "brightness"],
      brightness: 196,
      color_temp_kelvin: 3000,
      min_color_temp_kelvin: 2000,
      max_color_temp_kelvin: 5000,
    },
    last_changed: "2026-10-19T10:00:00Z",
    last_updated: "2026-10-19T10:00:00Z",
  },
};

function transport() {
  let listener: ((entities: HassEntities) => void) | undefined;
  const callService = vi.fn(async () => undefined);
  const value: HaTransport = {
    subscribeEntities(next) {
      listener = next;
      queueMicrotask(() => next(raw));
      return () => { listener = undefined; };
    },
    callService,
  };
  return { value, callService, emit: (entities: HassEntities) => listener?.(entities) };
}

describe("HaLightTile", () => {
  it("maps a raw light entity into the existing LightTile and routes toggle through the store", async () => {
    const fake = transport();
    const store = createHaStore(fake.value);
    render(
      <HaProvider store={store}>
        <HaLightTile entityId="light.living_room" />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Living room" })).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Living room" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("light", "toggle", { entity_id: "light.living_room" });
  });

  it("shows the unavailable slot when the light stops responding", async () => {
    const fake = transport();
    const store = createHaStore(fake.value);
    render(
      <HaProvider store={store}>
        <HaLightTile entityId="light.living_room" />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Living room" })).toBeTruthy());

    act(() => fake.emit({
      ...raw,
      "light.living_room": { ...raw["light.living_room"], state: "unavailable" },
    }));
    await waitFor(() => expect(screen.getByText("Unavailable")).toBeTruthy());
  });
});

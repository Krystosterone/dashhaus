import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaClimateTile } from "./HaClimateTile";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import type { HaTransport, HassEntities } from "../../../ha/types";

const raw: HassEntities = {
  "climate.living_room": {
    entity_id: "climate.living_room",
    state: "heat",
    attributes: {
      friendly_name: "Thermostat",
      hvac_modes: ["off", "heat", "cool"],
      hvac_action: "idle",
      current_temperature: 20.4,
      temperature: 21,
      min_temp: 7,
      max_temp: 30,
      target_temp_step: 0.5,
      temperature_unit: "°C",
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

describe("HaClimateTile", () => {
  it("maps a raw entity into the existing ClimateTile and routes controls through the store", async () => {
    const fake = transport();
    const store = createHaStore(fake.value);
    render(
      <HaProvider store={store}>
        <HaClimateTile entityId="climate.living_room" />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Thermostat" })).toBeTruthy());
    expect(screen.getByText(/20\.4°/)).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Thermostat, Heat/ }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("climate", "turn_off", { entity_id: "climate.living_room" });
  });
});

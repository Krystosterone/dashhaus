import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import type { HaTransport, HassEntities } from "../../../ha/types";
import { HaClimateModule } from "./HaClimateModule";

const raw: HassEntities = {
  "climate.living_room": {
    entity_id: "climate.living_room",
    state: "heat",
    attributes: {
      friendly_name: "Thermostat",
      hvac_modes: ["off", "heat", "cool", "heat_cool"],
      hvac_action: "heating",
      current_temperature: 20.4,
      temperature: 21.5,
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

function renderLive() {
  const fake = transport();
  render(
    <HaProvider store={createHaStore(fake.value)}>
      <HaClimateModule entityId="climate.living_room" loadHistory={false} />
    </HaProvider>,
  );
  return fake;
}

describe("HaClimateModule", () => {
  it("routes the key and target fader through native climate services", async () => {
    const fake = renderLive();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Thermostat" })).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Thermostat, turn off" }));
      fireEvent.change(screen.getByRole("slider", { name: "Thermostat target temperature" }), { target: { value: "22" } });
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("climate", "turn_off", { entity_id: "climate.living_room" });
    expect(fake.callService).toHaveBeenCalledWith("climate", "set_temperature", { entity_id: "climate.living_room", temperature: 22 });
  });

  it("removes controls when Home Assistant reports the entity unavailable", async () => {
    const fake = renderLive();
    await waitFor(() => expect(screen.getByRole("button", { name: "Thermostat, turn off" })).toBeTruthy());
    act(() => fake.emit({ "climate.living_room": { ...raw["climate.living_room"], state: "unavailable" } }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Thermostat, unavailable" }) as HTMLButtonElement).disabled).toBe(true));
    expect(screen.queryByRole("slider")).toBeNull();
  });
});

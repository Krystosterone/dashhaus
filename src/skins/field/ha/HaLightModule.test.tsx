import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaLightModule } from "./HaLightModule";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import type { HaTransport, HassEntities } from "../../../ha/types";

const raw: HassEntities = {
  "light.living_room": {
    entity_id: "light.living_room",
    state: "on",
    attributes: { friendly_name: "Living room", supported_color_modes: ["color_temp"], brightness: 196, color_temp_kelvin: 3000 },
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
      <HaLightModule entityId="light.living_room" />
    </HaProvider>,
  );
  return fake;
}

describe("HaLightModule", () => {
  it("routes the key to light.toggle and the fader to light.turn_on", async () => {
    const fake = renderLive();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Living room" })).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Living room" }));
      fireEvent.change(screen.getByRole("slider", { name: "Living room brightness" }), { target: { value: "40" } });
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("light", "toggle", { entity_id: "light.living_room" });
    expect(fake.callService).toHaveBeenCalledWith("light", "turn_on", { entity_id: "light.living_room", brightness_pct: 40 });
  });

  it("lays the controls flat when the light stops responding", async () => {
    const fake = renderLive();
    await waitFor(() => expect(screen.getByRole("button", { name: "Living room" })).toBeTruthy());
    act(() => fake.emit({ "light.living_room": { ...raw["light.living_room"], state: "unavailable" } }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Living room" }) as HTMLButtonElement).disabled).toBe(true));
    expect((screen.getByRole("slider") as HTMLInputElement).disabled).toBe(true);
  });
});

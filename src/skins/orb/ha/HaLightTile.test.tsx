import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaLightTile } from "./HaLightTile";
import type { HassEntities } from "@dashhaus/core";
import { renderConnected } from "@dashhaus/core/testing";

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


describe("HaLightTile", () => {
  it("maps a raw light entity into the existing LightTile and routes toggle through the store", async () => {
    const fake = renderConnected(<HaLightTile entityId="light.living_room" />, raw);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Living room" })).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Living room" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("light", "toggle", { entity_id: "light.living_room" });
  });

  it("shows the unavailable slot when the light stops responding", async () => {
    const fake = renderConnected(<HaLightTile entityId="light.living_room" />, raw);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Living room" })).toBeTruthy());

    act(() => fake.emit({
      ...raw,
      "light.living_room": { ...raw["light.living_room"], state: "unavailable" },
    }));
    await waitFor(() => expect(screen.getByText("Unavailable")).toBeTruthy());
  });
});

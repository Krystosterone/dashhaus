import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaHumidifierTile } from "./HaHumidifierTile";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import type { HaTransport, HassEntities } from "../../../ha/types";

const raw: HassEntities = {
  "humidifier.bedroom": {
    entity_id: "humidifier.bedroom",
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

describe("HaHumidifierTile", () => {
  it("maps the raw entity into the tile and routes the orb through the store", async () => {
    const fake = transport();
    render(
      <HaProvider store={createHaStore(fake.value)}>
        <HaHumidifierTile entityId="humidifier.bedroom" />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Bedroom" })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bedroom" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("humidifier", "toggle", { entity_id: "humidifier.bedroom" });
  });

  it("shows a missing entity as unavailable", async () => {
    const fake = transport();
    render(
      <HaProvider store={createHaStore(fake.value)}>
        <HaHumidifierTile entityId="humidifier.missing" name="Missing" />
      </HaProvider>,
    );
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

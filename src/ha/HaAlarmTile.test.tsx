import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaAlarmTile } from "./HaAlarmTile";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import type { HaTransport, HassEntities } from "./types";

const raw: HassEntities = {
  "alarm_control_panel.house": {
    entity_id: "alarm_control_panel.house",
    state: "disarmed",
    attributes: {
      friendly_name: "House alarm",
      code_format: null,
      code_arm_required: false,
      supported_features: 1 | 2,
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

describe("HaAlarmTile", () => {
  it("maps a raw entity into the existing AlarmTile and routes controls through the store", async () => {
    const fake = transport();
    const store = createHaStore(fake.value);
    render(
      <HaProvider store={store}>
        <HaAlarmTile entityId="alarm_control_panel.house" area="Whole home" />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "House alarm" })).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Arm away" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("alarm_control_panel", "alarm_arm_away", {
      entity_id: "alarm_control_panel.house",
    });
  });

  it("shows the unavailable slot when the panel stops responding", async () => {
    const fake = transport();
    const store = createHaStore(fake.value);
    render(
      <HaProvider store={store}>
        <HaAlarmTile entityId="alarm_control_panel.house" />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "House alarm" })).toBeTruthy());

    act(() => fake.emit({
      ...raw,
      "alarm_control_panel.house": { ...raw["alarm_control_panel.house"], state: "unavailable" },
    }));
    await waitFor(() => expect(screen.getByText("Not responding")).toBeTruthy());
  });
});

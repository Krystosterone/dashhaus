import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaToggleTile } from "./HaToggleTile";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import type { HaTransport, HassEntities } from "./types";

const raw: HassEntities = {
  "input_boolean.guest_mode": {
    entity_id: "input_boolean.guest_mode",
    state: "on",
    attributes: { friendly_name: "Guest" },
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

describe("HaToggleTile", () => {
  it("maps a raw entity into the existing ToggleTile and routes toggle through the store", async () => {
    const fake = transport();
    const store = createHaStore(fake.value);
    render(
      <HaProvider store={store}>
        <HaToggleTile entityId="input_boolean.guest_mode" domain="input_boolean" />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Guest" })).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Guest" }));
      await Promise.resolve();
    });
    expect(fake.callService).toHaveBeenCalledWith("input_boolean", "toggle", { entity_id: "input_boolean.guest_mode" });
  });

  it("passes host metadata through to the mapped entity", async () => {
    const fake = transport();
    const store = createHaStore(fake.value);
    render(
      <HaProvider store={store}>
        <HaToggleTile entityId="input_boolean.guest_mode" domain="input_boolean" icon="guest" color="lavender" description="Lets visitors on the Wi-Fi." />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Guest" })).toBeTruthy());
  });
});

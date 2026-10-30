import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaLight, HaToggle } from "./headless";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import type { HassEntities } from "./types";
import { fakeTransport } from "../testing";

const light = (id: string, name: string, state: "on" | "off") => ({
  entity_id: id,
  state,
  attributes: { friendly_name: name, supported_color_modes: ["onoff"] },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:00Z",
});

const raw: HassEntities = {
  "light.desk": light("light.desk", "Desk", "on"),
  "light.shelf": light("light.shelf", "Shelf", "off"),
  "switch.router": { ...light("switch.router", "Router", "on"), attributes: { friendly_name: "Router" } },
};

function setup() {
  const { transport, callService } = fakeTransport(raw);
  return { callService, store: createHaStore(transport) };
}

describe("headless components", () => {
  it("render any markup for each entity of a list, with its live state and actions", async () => {
    const { callService, store } = setup();
    render(
      <HaProvider store={store}>
        <ul>
          {["light.desk", "light.shelf"].map((id) => (
            <HaLight key={id} entityId={id} loadHistory={false}>
              {({ entity, actions }) => <li><button type="button" onClick={actions.onToggle}>{entity.name}: {entity.state}</button></li>}
            </HaLight>
          ))}
        </ul>
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Desk: on" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Shelf: off" })).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Shelf: off" }));
      await Promise.resolve();
    });
    expect(callService).toHaveBeenCalledWith("light", "toggle", { entity_id: "light.shelf" });
  });

  it("pass the hook's options through, required ones included", async () => {
    const { callService, store } = setup();
    render(
      <HaProvider store={store}>
        <HaToggle entityId="switch.router" name="WiFi" loadHistory={false}>
          {({ entity, actions }) => <button type="button" onClick={actions.onToggle}>{entity.name}</button>}
        </HaToggle>
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "WiFi" })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "WiFi" }));
      await Promise.resolve();
    });
    expect(callService).toHaveBeenCalledWith("switch", "toggle", { entity_id: "switch.router" });
  });
});

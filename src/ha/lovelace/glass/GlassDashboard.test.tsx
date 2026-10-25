import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaProvider } from "../../provider";
import { createHaStore } from "../../store";
import type { HaTransport, HassEntities } from "../../types";
import { GlassDashboard } from "./GlassDashboard";
import type { GlassCardConfig } from "./config";

const raw: HassEntities = {
  "light.desk": { entity_id: "light.desk", state: "on", attributes: { friendly_name: "Desk", supported_color_modes: ["onoff"] } },
  "switch.router": { entity_id: "switch.router", state: "on", attributes: { friendly_name: "WiFi" } },
  "input_boolean.guest": { entity_id: "input_boolean.guest", state: "off", attributes: { friendly_name: "Guest" } },
};

const items: GlassCardConfig[] = [
  { entity: "light.desk", kind: "light", area: "Office" },
  { entity: "switch.router", kind: "toggle", domain: "switch", name: "Router", area: "Hallway" },
  { entity: "input_boolean.guest", kind: "toggle", domain: "input_boolean", area: "Home" },
];

function setup(callService: HaTransport["callService"] = vi.fn(async () => undefined)) {
  const transport: HaTransport = {
    subscribeEntities(next) {
      queueMicrotask(() => next(raw));
      return () => undefined;
    },
    callService,
  };
  render(
    <HaProvider store={createHaStore(transport)}>
      <GlassDashboard title="Laid-back home" name="Sam" items={items} now={new Date(2026, 9, 24, 9, 30)} />
    </HaProvider>,
  );
}

describe("GlassDashboard", () => {
  it("greets, titles, and draws each card live with its area", async () => {
    setup();
    expect(screen.getByText("Good morning, Sam")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Laid-back home" })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Router" })).toBeTruthy();
    expect(screen.getByText("Office · On")).toBeTruthy();
  });

  it("narrows the grid to a room from the bar, and back to Home; an area called Home gets no room of its own", async () => {
    setup();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());
    const bar = screen.getByRole("navigation", { name: "Rooms" });
    expect(within(bar).getAllByRole("button").map((b) => b.textContent)).toEqual(["Home", "Hallway", "Office"]);

    fireEvent.click(within(bar).getByRole("button", { name: "Office" }));
    expect(screen.queryByRole("heading", { name: "Router" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy();

    fireEvent.click(within(bar).getByRole("button", { name: "Home" }));
    expect(screen.getByRole("heading", { name: "Router" })).toBeTruthy();
  });

  it("tells a rejected command above the room bar, and dismisses it", async () => {
    setup(vi.fn(async () => { throw new Error("nope"); }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Desk" })).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Desk power" }));
      await Promise.resolve();
    });
    const notice = await screen.findByRole("alert", { name: "Home Assistant action failed" });
    expect(within(notice).getByText("Desk didn’t respond")).toBeTruthy();

    fireEvent.click(within(notice).getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByRole("alert", { name: "Home Assistant action failed" })).toBeNull());
  });
});

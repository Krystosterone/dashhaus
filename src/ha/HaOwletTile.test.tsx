import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaOwletTile } from "./HaOwletTile";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import type { HaTransport, HassEntities, HassEntity } from "./types";

const sensor = (entity_id: string, state: string, friendly_name: string): HassEntity => ({
  entity_id,
  state,
  attributes: { friendly_name },
  last_changed: new Date().toISOString(),
  last_updated: new Date().toISOString(),
});

const BASE = "sensor.owlet_sock_ac0";
const raw: HassEntities = {
  [`${BASE}_sleep_state`]: sensor(`${BASE}_sleep_state`, "light_sleep", "Owlet Sock AC0 Sleep state"),
  [`${BASE}_heart_rate`]: sensor(`${BASE}_heart_rate`, "133", "Owlet Sock AC0 Heart rate"),
  [`${BASE}_o2_saturation`]: sensor(`${BASE}_o2_saturation`, "97", "Owlet Sock AC0 O2 saturation"),
  "sensor.nursery_bpm": sensor("sensor.nursery_bpm", "140", "Nursery bpm"),
};

function store() {
  const transport: HaTransport = {
    subscribeEntities(next) {
      queueMicrotask(() => next(raw));
      return () => {};
    },
    callService: async () => undefined,
  };
  return createHaStore(transport);
}

describe("HaOwletTile", () => {
  it("composes the sleep state with the integration's heart rate and oxygen sensors", async () => {
    render(<HaProvider store={store()}><HaOwletTile entityId={`${BASE}_sleep_state`} name="Nova" /></HaProvider>);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Nova" })).toBeTruthy());
    expect(screen.getByText("Light sleep")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nova: live, heart rate 133 beats per minute, oxygen 97 percent. Open details" })).toBeTruthy();
  });

  it("is live with fresh readings, and warns once they are older than the stale window", async () => {
    const { container, unmount } = render(<HaProvider store={store()}><HaOwletTile entityId={`${BASE}_sleep_state`} name="Nova" /></HaProvider>);
    await waitFor(() => expect(container.querySelector(".ow-heart[data-live]")).not.toBeNull());
    unmount();
    // A negative stale window: even a reading from this instant counts as old.
    const stale = render(<HaProvider store={store()}><HaOwletTile entityId={`${BASE}_sleep_state`} name="Nova" staleAfterMinutes={-1} /></HaProvider>);
    await waitFor(() => expect(stale.container.querySelector("article")?.getAttribute("data-alert")).toBe("warn"));
  });

  it("names the sock after its device by default", async () => {
    render(<HaProvider store={store()}><HaOwletTile entityId={`${BASE}_sleep_state`} /></HaProvider>);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Owlet Sock AC0" })).toBeTruthy());
  });

  it("uses explicit companion ids over the derived ones", async () => {
    render(<HaProvider store={store()}><HaOwletTile entityId={`${BASE}_sleep_state`} name="Nova" heartRateEntityId="sensor.nursery_bpm" /></HaProvider>);
    await waitFor(() => expect(screen.getByRole("button", { name: /heart rate 140 beats per minute, oxygen 97 percent/ })).toBeTruthy());
  });

  it("shows a missing sock as unavailable", async () => {
    render(<HaProvider store={store()}><HaOwletTile entityId="sensor.owlet_sock_gone_sleep_state" name="Nova" /></HaProvider>);
    await waitFor(() => expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0));
  });
});

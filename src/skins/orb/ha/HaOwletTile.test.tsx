import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaOwletTile } from "./HaOwletTile";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import type { HaTransport, HassEntities, HassEntity } from "../../../ha/types";

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
  "binary_sensor.owlet_sock_ac0_low_oxygen_alert": sensor("binary_sensor.owlet_sock_ac0_low_oxygen_alert", "off", "Owlet Sock AC0 Low oxygen alert"),
  "binary_sensor.owlet_sock_ac0_sock_off": sensor("binary_sensor.owlet_sock_ac0_sock_off", "off", "Owlet Sock AC0 Sock off"),
  "binary_sensor.nursery_panic": sensor("binary_sensor.nursery_panic", "on", "Nursery panic"),
};

function store(overrides: HassEntities = {}) {
  const transport: HaTransport = {
    subscribeEntities(next) {
      queueMicrotask(() => next({ ...raw, ...overrides }));
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

  it("sounds the integration's alerts beside the sleep sensor", async () => {
    const on = { ...raw["binary_sensor.owlet_sock_ac0_low_oxygen_alert"], state: "on" };
    render(<HaProvider store={store({ [on.entity_id]: on })}><HaOwletTile entityId={`${BASE}_sleep_state`} name="Nova" /></HaProvider>);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Low oxygen97% O₂"));
  });

  it("uses an explicit alert sensor, and stays silent while every alert is off", async () => {
    const view = render(<HaProvider store={store()}><HaOwletTile entityId={`${BASE}_sleep_state`} name="Nova" /></HaProvider>);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Nova" })).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
    view.unmount();
    render(<HaProvider store={store()}><HaOwletTile entityId={`${BASE}_sleep_state`} name="Nova" alertEntityIds={{ high_heart_rate: "binary_sensor.nursery_panic" }} /></HaProvider>);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("High heart rate133 bpm"));
  });

  it("says Charging from the charging sensor", async () => {
    const charging = { [`binary_sensor.owlet_sock_ac0_charging`]: sensor("binary_sensor.owlet_sock_ac0_charging", "on", "Charging") };
    const offline = Object.fromEntries([`${BASE}_sleep_state`, `${BASE}_heart_rate`, `${BASE}_o2_saturation`].map((id) => [id, { ...raw[id], state: "unavailable" }]));
    render(<HaProvider store={store({ ...offline, ...charging })}><HaOwletTile entityId={`${BASE}_sleep_state`} name="Nova" /></HaProvider>);
    await waitFor(() => expect(screen.getByText("Charging")).toBeTruthy());
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

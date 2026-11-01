import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { HaAlarm, HaClimate, HaCover, HaHumidifier, HaLight, HaOwlet, HaSensor, HaSound, HaToggle, HaWeather } from "./headless";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import type { HassEntities } from "./types";
import { fakeTransport } from "../testing";
import alarmFixture from "./fixtures/alarm.json";
import climateFixture from "./fixtures/climate.json";
import coverFixture from "./fixtures/cover.json";
import humidifierFixture from "./fixtures/humidifier.json";
import lightFixture from "./fixtures/light.json";
import owletFixture from "./fixtures/owlet.json";
import sensorFixture from "./fixtures/sensor.json";
import soundFixture from "./fixtures/sound.json";
import toggleFixture from "./fixtures/toggle.json";
import weatherFixture from "./fixtures/weather.json";

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
  ...(lightFixture as HassEntities),
  ...(climateFixture as HassEntities),
  ...(sensorFixture as HassEntities),
  ...(weatherFixture as HassEntities),
  ...(coverFixture as HassEntities),
  ...(toggleFixture as HassEntities),
  ...(alarmFixture as HassEntities),
  ...(owletFixture as HassEntities),
  ...(humidifierFixture as HassEntities),
  ...(soundFixture as HassEntities),
};

function setup() {
  const fake = fakeTransport(raw);
  const sent: string[] = [];
  fake.transport.sendMessage = vi.fn(async (type: string) => {
    sent.push(type);
    return {};
  });
  return { callService: fake.callService, calls: fake.calls, sent, store: createHaStore(fake.transport) };
}

function LiveProbe({ name, history, actions, hasActions }: { name: string; history: unknown; actions: unknown; hasActions: boolean }) {
  return <span data-testid="live">{`${name}|${history !== undefined}|${hasActions ? actions !== undefined : "n/a"}`}</span>;
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

  it("pass onActionError into the domain handlers", async () => {
    const fake = fakeTransport(raw);
    fake.transport.callService = vi.fn(async () => { throw new Error("rejected"); });
    const failing = createHaStore(fake.transport);
    const onActionError = vi.fn();

    render(
      <HaProvider store={failing}>
        <HaLight entityId="light.living_room" name="Desk lamp" loadHistory={false} onActionError={onActionError}>
          {({ entity, actions }) => <button type="button" onClick={actions.onToggle}>{entity.name}</button>}
        </HaLight>
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Desk lamp" })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Desk lamp" }));
      await Promise.resolve();
    });

    await waitFor(() => expect(onActionError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed" })));
  });

  /** Every entity hook has a component that hands back the same entity, history and actions. */
  const parity: Array<{ hook: string; entityId: string; hasActions: boolean; node: (name: string) => ReactElement }> = [
    {
      hook: "HaLight",
      entityId: "light.living_room",
      hasActions: true,
      node: (name) => (
        <HaLight entityId="light.living_room" name={name} loadHistory={false}>
          {({ entity, history, actions }) => <LiveProbe name={entity.name} history={history} actions={actions} hasActions />}
        </HaLight>
      ),
    },
    {
      hook: "HaClimate",
      entityId: "climate.living_room",
      hasActions: true,
      node: (name) => (
        <HaClimate entityId="climate.living_room" name={name} loadHistory={false}>
          {({ entity, history, actions }) => <LiveProbe name={entity.name} history={history} actions={actions} hasActions />}
        </HaClimate>
      ),
    },
    {
      hook: "HaWeather",
      entityId: "weather.home",
      hasActions: false,
      node: (name) => (
        <HaWeather entityId="weather.home" name={name} loadHistory={false} loadForecasts={false}>
          {({ entity, history }) => <LiveProbe name={entity.name} history={history} actions={undefined} hasActions={false} />}
        </HaWeather>
      ),
    },
    {
      hook: "HaSensor",
      entityId: "sensor.living_room_temperature",
      hasActions: false,
      node: (name) => (
        <HaSensor entityId="sensor.living_room_temperature" name={name} loadHistory={false}>
          {({ entity, history }) => <LiveProbe name={entity.name} history={history} actions={undefined} hasActions={false} />}
        </HaSensor>
      ),
    },
    {
      hook: "HaCover",
      entityId: "cover.living_room",
      hasActions: true,
      node: (name) => (
        <HaCover entityId="cover.living_room" name={name} loadHistory={false}>
          {({ entity, history, actions }) => <LiveProbe name={entity.name} history={history} actions={actions} hasActions />}
        </HaCover>
      ),
    },
    {
      hook: "HaToggle",
      entityId: "input_boolean.guest_mode",
      hasActions: true,
      node: (name) => (
        <HaToggle entityId="input_boolean.guest_mode" name={name} loadHistory={false}>
          {({ entity, history, actions }) => <LiveProbe name={entity.name} history={history} actions={actions} hasActions />}
        </HaToggle>
      ),
    },
    {
      hook: "HaAlarm",
      entityId: "alarm_control_panel.disarmed",
      hasActions: true,
      node: (name) => (
        <HaAlarm entityId="alarm_control_panel.disarmed" name={name} loadHistory={false}>
          {({ entity, history, actions }) => <LiveProbe name={entity.name} history={history} actions={actions} hasActions />}
        </HaAlarm>
      ),
    },
    {
      hook: "HaOwlet",
      entityId: "sensor.owlet_sock_ac000w0123_sleep_state",
      hasActions: true,
      node: (name) => (
        <HaOwlet entityId="sensor.owlet_sock_ac000w0123_sleep_state" name={name} loadHistory={false}>
          {({ entity, history, actions }) => <LiveProbe name={entity.name} history={history} actions={actions} hasActions />}
        </HaOwlet>
      ),
    },
    {
      hook: "HaHumidifier",
      entityId: "humidifier.bedroom",
      hasActions: true,
      node: (name) => (
        <HaHumidifier entityId="humidifier.bedroom" name={name} loadHistory={false}>
          {({ entity, history, actions }) => <LiveProbe name={entity.name} history={history} actions={actions} hasActions />}
        </HaHumidifier>
      ),
    },
    {
      hook: "HaSound",
      entityId: "switch.bedroom",
      hasActions: true,
      node: (name) => (
        <HaSound entityId="switch.bedroom" name={name} loadHistory={false}>
          {({ entity, history, actions }) => <LiveProbe name={entity.name} history={history} actions={actions} hasActions />}
        </HaSound>
      ),
    },
  ];

  it.each(parity)("$hook pairs its hook: entity, history, actions and the name option", async ({ hasActions, node }) => {
    const { sent, store } = setup();

    render(<HaProvider store={store}>{node("Parity")}</HaProvider>);

    await waitFor(() => expect(screen.getByTestId("live").textContent).toBe(`Parity|true|${hasActions ? "true" : "n/a"}`));
    expect(sent).not.toContain("history/history_during_period");
  });
});

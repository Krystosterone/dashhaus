import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkEntityId } from "./dev";
import { useHaAlarm } from "./hooks/alarm";
import { useHaClimate } from "./hooks/climate";
import { useHaCover } from "./hooks/cover";
import { useHaHumidifier } from "./hooks/humidifier";
import { useHaLight } from "./hooks/light";
import { useHaOwlet } from "./hooks/owlet";
import { useHaSensor } from "./hooks/sensor";
import { useHaSound } from "./hooks/sound";
import { useHaToggle } from "./hooks/toggle";
import { useHaWeather } from "./hooks/weather";
import { HaProvider } from "./provider";
import type { HaSnapshot, HaStore } from "./types";

function fakeStore() {
  const listeners = new Set<() => void>();
  let snapshot: HaSnapshot = { status: "idle", entities: {}, generation: 0 };
  const store: HaStore = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(),
    callService: vi.fn(async () => undefined),
    query: vi.fn(async () => undefined),
    callApi: vi.fn(async () => undefined),
  };
  const set = (next: Partial<HaSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) listener();
  };
  return { store, set };
}

function Probe({ use }: { use: () => unknown }) {
  use();
  return null;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("checkEntityId", () => {
  it("warns once for a malformed entity id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(() => checkEntityId("Light.Desk", ["light"], "useHaLight")).not.toThrow();
    checkEntityId("Light.Desk", ["light"], "useHaLight");

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/useHaLight: "Light\.Desk" is not a Home Assistant entity id/));
  });

  it("warns once for an id from the wrong domain, naming the expected one", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    checkEntityId("sensor.desk", ["light"], "useHaLight");
    checkEntityId("sensor.desk", ["light"], "useHaLight");

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/useHaLight: "sensor\.desk" is a sensor entity; expected light\.\*/));
  });

  it("names both domains a toggle accepts", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    checkEntityId("light.lamp", ["input_boolean", "switch"], "useHaToggle");

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("expected input_boolean.* or switch.*"));
  });

  it("is silent for a valid id, including one the store does not have", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    checkEntityId("light.desk", ["light"], "useHaLight");
    checkEntityId("switch.router", ["input_boolean", "switch"], "useHaToggle");
    checkEntityId("sensor.missing", ["sensor"], "useHaSensor");

    expect(warn).not.toHaveBeenCalled();
  });

  it("is silent in production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");

    checkEntityId("Light.Desk", ["light"], "useHaLight");
    checkEntityId("sensor.desk", ["light"], "useHaLight");

    expect(warn).not.toHaveBeenCalled();
  });
});

/** Each hook checks its own entity id; a wrong domain names the hook that saw it. */
describe("useHa hook entity checks", () => {
  const cases: Array<[string, string, (entityId: string) => unknown]> = [
    ["useHaLight", "sensor.contract_light", (entityId) => useHaLight(entityId, { loadHistory: false })],
    ["useHaClimate", "sensor.thermostat", (entityId) => useHaClimate(entityId, { loadHistory: false })],
    ["useHaWeather", "sensor.home", (entityId) => useHaWeather(entityId, { loadHistory: false, loadForecasts: false })],
    ["useHaSensor", "light.temperature", (entityId) => useHaSensor(entityId, { loadHistory: false })],
    ["useHaCover", "light.blind", (entityId) => useHaCover(entityId, { loadHistory: false })],
    ["useHaToggle", "light.contract_toggle", (entityId) => useHaToggle(entityId, { loadHistory: false })],
    ["useHaAlarm", "sensor.panel", (entityId) => useHaAlarm(entityId, { loadHistory: false })],
    ["useHaOwlet", "light.sock", (entityId) => useHaOwlet(entityId, { loadHistory: false })],
    ["useHaHumidifier", "sensor.humidifier", (entityId) => useHaHumidifier(entityId, { loadHistory: false })],
    ["useHaSound", "light.speaker", (entityId) => useHaSound(entityId, { loadHistory: false })],
  ];

  for (const [hook, wrong, use] of cases) {
    it(`${hook} warns for an entity from another domain`, () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const fake = fakeStore();

      render(<HaProvider store={fake.store}><Probe use={() => use(wrong)} /></HaProvider>);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(`${hook}:`));
    });
  }

  it("does not warn for a valid entity that has not arrived", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fake = fakeStore();

    render(<HaProvider store={fake.store}><Probe use={() => useHaLight("light.not_arrived", { loadHistory: false })} /></HaProvider>);

    expect(warn).not.toHaveBeenCalled();
  });
});

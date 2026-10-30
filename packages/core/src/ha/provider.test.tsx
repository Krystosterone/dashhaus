import { StrictMode, act } from "react";
import { createRoot } from "react-dom/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { HaProvider, useHaEntities, useHaEntity } from "./provider";
import { createHaStore } from "./store";
import type { HaSnapshot, HaStore, HassEntities, HassEntity } from "./types";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(() => { delete globalThis.IS_REACT_ACT_ENVIRONMENT; });

function fakeStore(): HaStore {
  const snapshot: HaSnapshot = { status: "idle", entities: {}, generation: 0 };
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(),
    callService: vi.fn(async () => undefined),
    query: vi.fn(async () => undefined),
    callApi: vi.fn(async () => undefined),
  };
}

describe("HaProvider", () => {
  it("does not close a store during React StrictMode effect replay", async () => {
    const store = fakeStore();
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <StrictMode>
          <HaProvider store={store}><span>light</span></HaProvider>
        </StrictMode>,
      );
    });
    expect(store.connect).toHaveBeenCalledOnce();
    expect(store.disconnect).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    expect(store.disconnect).toHaveBeenCalledOnce();
  });

  it("keeps a shared store connected while one provider still owns it", async () => {
    const store = fakeStore();
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <HaProvider store={store}>
          <HaProvider store={store}><span>inner</span></HaProvider>
        </HaProvider>,
      );
    });
    await act(async () => {
      root.render(<HaProvider store={store}><span>outer</span></HaProvider>);
      await Promise.resolve();
    });

    expect(store.disconnect).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    expect(store.disconnect).toHaveBeenCalledOnce();
  });
});

describe("useHaEntity", () => {
  it("re-renders only when its own entity changes", async () => {
    let emit: ((entities: HassEntities) => void) | undefined;
    const store = createHaStore({
      subscribeEntities(listener) { emit = listener; return () => undefined; },
      callService: async () => undefined,
    });
    const lamp: HassEntity = { entity_id: "light.lamp", state: "on", attributes: {} };
    const renders = vi.fn();
    function Probe() {
      const entity = useHaEntity("light.lamp");
      renders(entity?.state);
      return null;
    }
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => { root.render(<HaProvider store={store}><Probe /></HaProvider>); });
    await act(async () => { emit?.({ "light.lamp": lamp, "sensor.power": { entity_id: "sensor.power", state: "1", attributes: {} } }); });
    const settled = renders.mock.calls.length;
    await act(async () => { emit?.({ "light.lamp": lamp, "sensor.power": { entity_id: "sensor.power", state: "2", attributes: {} } }); });
    expect(renders).toHaveBeenCalledTimes(settled);
    await act(async () => { emit?.({ "light.lamp": { ...lamp, state: "off" }, "sensor.power": { entity_id: "sensor.power", state: "2", attributes: {} } }); });
    expect(renders).toHaveBeenLastCalledWith("off");

    await act(async () => { root.unmount(); });
  });
});

describe("useHaEntities", () => {
  it("returns the entities in order, and re-renders only when one of them changes", async () => {
    let emit: ((entities: HassEntities) => void) | undefined;
    const store = createHaStore({
      subscribeEntities(listener) { emit = listener; return () => undefined; },
      callService: async () => undefined,
    });
    const a: HassEntity = { entity_id: "binary_sensor.a", state: "off", attributes: {} };
    const b: HassEntity = { entity_id: "binary_sensor.b", state: "off", attributes: {} };
    const other = (state: string): HassEntity => ({ entity_id: "sensor.power", state, attributes: {} });
    const renders = vi.fn();
    function Probe() {
      const entities = useHaEntities(["binary_sensor.b", "binary_sensor.missing", "binary_sensor.a"]);
      renders(entities.map((entity) => entity?.state ?? "-").join(","));
      return null;
    }
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => { root.render(<HaProvider store={store}><Probe /></HaProvider>); });
    await act(async () => { emit?.({ [a.entity_id]: a, [b.entity_id]: b, "sensor.power": other("1") }); });
    expect(renders).toHaveBeenLastCalledWith("off,-,off");
    const settled = renders.mock.calls.length;
    await act(async () => { emit?.({ [a.entity_id]: a, [b.entity_id]: b, "sensor.power": other("2") }); });
    expect(renders).toHaveBeenCalledTimes(settled);
    await act(async () => { emit?.({ [a.entity_id]: { ...a, state: "on" }, [b.entity_id]: b, "sensor.power": other("2") }); });
    expect(renders).toHaveBeenLastCalledWith("off,-,on");
    await act(async () => { root.unmount(); });
  });
});

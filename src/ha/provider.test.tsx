import { StrictMode, act } from "react";
import { createRoot } from "react-dom/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { HaProvider, useHaEntity } from "./provider";
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

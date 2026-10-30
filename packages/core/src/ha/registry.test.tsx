import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaProvider } from "./provider";
import type { HaSnapshot, HaStore } from "./types";
import { areaNamesFromRegistries, useHaArea } from "./registry";

const areas = [
  { area_id: "living", name: "Living Room" },
  { area_id: "kitchen", name: "Kitchen" },
  { area_id: "empty", name: "" },
];
const devices = [{ id: "hue-bridge-1", area_id: "kitchen" }, { id: "plug-2", area_id: null }];
/** `config/entity_registry/list_for_display` shape. */
const entities = (...rows: unknown[]) => ({ entity_categories: { 0: "config", 1: "diagnostic" }, entities: rows });

describe("areaNamesFromRegistries", () => {
  it("uses the entity's own area", () => {
    const names = areaNamesFromRegistries(entities({ ei: "light.living", ai: "living", di: "hue-bridge-1" }), devices, areas);
    expect(names.get("light.living")).toBe("Living Room");
  });

  it("inherits the device's area when the entity has none", () => {
    const names = areaNamesFromRegistries(entities({ ei: "light.counter", di: "hue-bridge-1" }), devices, areas);
    expect(names.get("light.counter")).toBe("Kitchen");
  });

  it("leaves out entities without an area, unknown areas, and empty names", () => {
    const names = areaNamesFromRegistries(
      entities({ ei: "switch.plug", di: "plug-2" }, { ei: "light.garage", ai: "garage" }, { ei: "light.x", ai: "empty" }, { ei: "light.y" }),
      devices,
      areas,
    );
    expect(names.size).toBe(0);
  });

  it("ignores garbage payloads and rows", () => {
    expect(areaNamesFromRegistries(null, "nope", 42).size).toBe(0);
    expect(areaNamesFromRegistries([{ ei: "light.living", ai: "living" }], devices, areas).size).toBe(0);
    expect(areaNamesFromRegistries(entities(7, { ei: 7, ai: "living" }, { ei: "light.living", ai: 42 }), devices, areas).size).toBe(0);
  });
});

/** Answer the three registry commands. */
const registries = (entityRegistry: unknown) => async (type: string) => {
  if (type === "config/entity_registry/list_for_display") return entityRegistry;
  if (type === "config/device_registry/list") return devices;
  if (type === "config/area_registry/list") return areas;
  throw new Error(`unexpected ${type}`);
};

function fakeStore() {
  const listeners = new Set<() => void>();
  let snapshot: HaSnapshot = { status: "idle", entities: {}, generation: 0 };
  const callApi = vi.fn<(type: string, payload?: Record<string, unknown>) => Promise<unknown>>(async () => undefined);
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
    callApi,
  };
  const set = (next: Partial<HaSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) listener();
  };
  return { store, callApi, set };
}

function Probe({ entityId }: { entityId: string }) {
  const area = useHaArea(entityId);
  return <span data-testid="area">{area ?? ""}</span>;
}

const areaText = () => screen.getByTestId("area").textContent ?? "";

describe("useHaArea", () => {
  it("resolves the area name once connected", async () => {
    const fake = fakeStore();
    fake.callApi.mockImplementation(registries(entities({ ei: "light.living", ai: "living" })));
    fake.set({ status: "connected", generation: 1 });

    render(<HaProvider store={fake.store}><Probe entityId="light.living" /></HaProvider>);

    await waitFor(() => expect(areaText()).toBe("Living Room"));
    expect(fake.callApi.mock.calls.map(([type]) => type).sort()).toEqual([
      "config/area_registry/list",
      "config/device_registry/list",
      "config/entity_registry/list_for_display",
    ]);
  });

  it("reads the registries once per generation, however many tiles mount", async () => {
    const fake = fakeStore();
    fake.callApi.mockImplementation(registries(entities({ ei: "light.living", ai: "living" }, { ei: "light.counter", di: "hue-bridge-1" })));
    fake.set({ status: "connected", generation: 1 });

    const view = render(
      <HaProvider store={fake.store}>
        <Probe entityId="light.living" />
        <Probe entityId="light.counter" />
      </HaProvider>,
    );
    await waitFor(() => expect(screen.getAllByTestId("area").map((node) => node.textContent)).toEqual(["Living Room", "Kitchen"]));

    // A tile mounted later in the same generation reuses the settled read.
    view.rerender(
      <HaProvider store={fake.store}>
        <Probe entityId="light.living" />
        <Probe entityId="light.counter" />
        <Probe entityId="light.living" />
      </HaProvider>,
    );
    await waitFor(() => expect(screen.getAllByTestId("area")[2].textContent).toBe("Living Room"));
    expect(fake.callApi).toHaveBeenCalledTimes(3);

    act(() => fake.set({ generation: 2 }));
    await waitFor(() => expect(fake.callApi).toHaveBeenCalledTimes(6));
  });

  it("ignores late results after a generation change", async () => {
    const fake = fakeStore();
    const resolvers: Array<() => void> = [];
    fake.callApi.mockImplementation((type: string) => new Promise((resolve) => {
      resolvers.push(() => void registries(entities({ ei: "light.living", ai: "living" }))(type).then(resolve));
    }));
    fake.set({ status: "connected", generation: 1 });

    render(<HaProvider store={fake.store}><Probe entityId="light.living" /></HaProvider>);
    await waitFor(() => expect(resolvers).toHaveLength(3));

    act(() => fake.set({ generation: 2 }));
    await waitFor(() => expect(resolvers).toHaveLength(6));

    // Resolve only the stale generation-1 reads; they must be ignored.
    await act(async () => { resolvers.slice(0, 3).forEach((resolve) => resolve()); });
    expect(areaText()).toBe("");

    await act(async () => { resolvers.slice(3).forEach((resolve) => resolve()); });
    await waitFor(() => expect(areaText()).toBe("Living Room"));
  });

  it("stays undefined when a registry read rejects", async () => {
    const fake = fakeStore();
    fake.callApi.mockRejectedValue(new Error("no sendMessage"));
    fake.set({ status: "connected", generation: 1 });

    render(<HaProvider store={fake.store}><Probe entityId="light.living" /></HaProvider>);

    await waitFor(() => expect(fake.callApi).toHaveBeenCalled());
    expect(areaText()).toBe("");
  });

  it("stays undefined and fetches nothing while disconnected", () => {
    const fake = fakeStore();

    render(<HaProvider store={fake.store}><Probe entityId="light.living" /></HaProvider>);

    expect(areaText()).toBe("");
    expect(fake.callApi).not.toHaveBeenCalled();
  });
});

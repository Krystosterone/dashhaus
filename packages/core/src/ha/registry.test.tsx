import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaProvider } from "./provider";
import type { HaSnapshot, HaStore } from "./types";
import { areaMembership, areaNamesFromRegistries, readRegistries, useHaArea, useHaAreas, useHaRegistry } from "./registry";

const areas = [
  { area_id: "living", name: "Living Room", icon: "mdi:sofa", floor_id: "ground", aliases: ["lounge"] },
  { area_id: "kitchen", name: "Kitchen", floor_id: "ground" },
  { area_id: "attic", name: "Attic" },
  { area_id: "empty", name: "" },
];
const floors = [{ floor_id: "ground", name: "Ground floor", level: 0 }];
const devices = [
  { id: "hue-bridge-1", area_id: "kitchen", name: "Hue bridge", name_by_user: "Hall bridge", manufacturer: "Signify", model: "BSB002" },
  { id: "plug-2", area_id: null },
];
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

describe("readRegistries", () => {
  it("maps typed areas, floors, devices and the entity display", () => {
    const registry = readRegistries(
      entities({ ei: "light.living", ai: "living", di: "hue-bridge-1", pl: "hue", ec: 1, hb: true }),
      devices,
      areas,
      floors,
    );

    expect(registry.areas).toEqual([
      { id: "living", name: "Living Room", icon: "mdi:sofa", floorId: "ground", labels: [], aliases: ["lounge"] },
      { id: "kitchen", name: "Kitchen", icon: undefined, floorId: "ground", labels: [], aliases: [] },
      { id: "attic", name: "Attic", icon: undefined, floorId: undefined, labels: [], aliases: [] },
    ]);
    expect(registry.floors).toEqual([{ id: "ground", name: "Ground floor", level: 0, icon: undefined, aliases: [] }]);
    expect(registry.devices[0]).toEqual({
      id: "hue-bridge-1",
      name: "Hue bridge",
      nameByUser: "Hall bridge",
      areaId: "kitchen",
      manufacturer: "Signify",
      model: "BSB002",
      disabledBy: undefined,
    });
    expect(registry.entities.get("light.living")).toEqual({
      entityId: "light.living",
      areaId: "living",
      deviceId: "hue-bridge-1",
      platform: "hue",
      entityCategory: "diagnostic",
      hidden: true,
    });
    expect(registry.membership.get("light.living")).toBe("living");
  });

  it("tolerates garbage payloads", () => {
    const registry = readRegistries(null, "nope", 42, 7);
    expect(registry).toEqual({ areas: [], floors: [], devices: [], entities: new Map(), membership: new Map() });
  });
});

describe("areaMembership", () => {
  it("prefers the entity's own area, falls back to the device's, and keeps unknown ids", () => {
    const membership = areaMembership(
      entities(
        { ei: "light.own", ai: "living", di: "hue-bridge-1" },
        { ei: "light.inherited", di: "hue-bridge-1" },
        { ei: "light.unknown", ai: "garage" },
        { ei: "light.none" },
        { ei: "light.garbage", ai: 42 },
      ),
      devices,
    );

    expect(Object.fromEntries(membership)).toEqual({
      "light.own": "living",
      "light.inherited": "kitchen",
      "light.unknown": "garage",
    });
  });
});

/** Answer the four registry commands. */
const registries = (entityRegistry: unknown) => async (type: string) => {
  if (type === "config/entity_registry/list_for_display") return entityRegistry;
  if (type === "config/device_registry/list") return devices;
  if (type === "config/area_registry/list") return areas;
  if (type === "config/floor_registry/list") return floors;
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

function AreasProbe() {
  const groups = useHaAreas();
  return <span data-testid="areas">{JSON.stringify(groups?.map((group) => [group.area.name, group.entityIds]))}</span>;
}

const areaText = () => screen.getByTestId("area").textContent ?? "";
const areasText = () => screen.getByTestId("areas").textContent ?? "";

describe("useHaRegistry", () => {
  it("reads the registries once per generation and shares them across callers", async () => {
    const fake = fakeStore();
    fake.callApi.mockImplementation(registries(entities({ ei: "light.living", ai: "living" }, { ei: "light.counter", di: "hue-bridge-1" })));
    fake.set({ status: "connected", generation: 1 });

    expect(fake.store.getSnapshot().entities).toEqual({});
    render(
      <HaProvider store={fake.store}>
        <Probe entityId="light.living" />
        <Probe entityId="light.counter" />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getAllByTestId("area").map((node) => node.textContent)).toEqual(["Living Room", "Kitchen"]));
    expect(fake.callApi.mock.calls.map(([type]) => type).sort()).toEqual([
      "config/area_registry/list",
      "config/device_registry/list",
      "config/entity_registry/list_for_display",
      "config/floor_registry/list",
    ]);

    act(() => fake.set({ entities: { "light.living": { entity_id: "light.living", state: "on", attributes: {} } } }));
    expect(fake.callApi).toHaveBeenCalledTimes(4);

    act(() => fake.set({ generation: 2 }));
    await waitFor(() => expect(fake.callApi).toHaveBeenCalledTimes(8));
  });

  it("keeps the areas when the floor registry is not available", async () => {
    const fake = fakeStore();
    const commands = registries(entities({ ei: "light.living", ai: "living" }));
    fake.callApi.mockImplementation((type: string) => (
      type === "config/floor_registry/list" ? Promise.reject(new Error("unsupported")) : commands(type)
    ));
    fake.set({ status: "connected", generation: 1 });

    render(<HaProvider store={fake.store}><Probe entityId="light.living" /></HaProvider>);

    await waitFor(() => expect(areaText()).toBe("Living Room"));
    expect(fake.callApi).toHaveBeenCalledTimes(4);
  });

  it("ignores late results after a generation change", async () => {
    const fake = fakeStore();
    const resolvers: Array<() => void> = [];
    fake.callApi.mockImplementation((type: string) => new Promise((resolve) => {
      resolvers.push(() => void registries(entities({ ei: "light.living", ai: "living" }))(type).then(resolve));
    }));
    fake.set({ status: "connected", generation: 1 });

    render(<HaProvider store={fake.store}><Probe entityId="light.living" /></HaProvider>);
    await waitFor(() => expect(resolvers).toHaveLength(4));

    act(() => fake.set({ generation: 2 }));
    await waitFor(() => expect(resolvers).toHaveLength(8));

    // Resolve only the stale generation-1 reads; they must be ignored.
    await act(async () => { resolvers.slice(0, 4).forEach((resolve) => resolve()); });
    expect(areaText()).toBe("");

    await act(async () => { resolvers.slice(4).forEach((resolve) => resolve()); });
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

describe("useHaAreas", () => {
  it("groups entities under their own or inherited area, keeping empty areas", async () => {
    const fake = fakeStore();
    fake.callApi.mockImplementation(registries(entities(
      { ei: "light.living", ai: "living" },
      { ei: "light.counter", di: "hue-bridge-1" },
      { ei: "light.unknown", ai: "garage" },
      { ei: "light.none" },
    )));
    fake.set({ status: "connected", generation: 1 });

    render(<HaProvider store={fake.store}><AreasProbe /></HaProvider>);

    await waitFor(() => expect(areasText()).toBe(JSON.stringify([
      ["Living Room", ["light.living"]],
      ["Kitchen", ["light.counter"]],
      ["Attic", []],
    ])));
  });

  it("does not recompute when entity state changes", async () => {
    const fake = fakeStore();
    fake.callApi.mockImplementation(registries(entities({ ei: "light.living", ai: "living" })));
    fake.set({ status: "connected", generation: 1 });

    render(<HaProvider store={fake.store}><AreasProbe /></HaProvider>);
    await waitFor(() => expect(areasText()).toContain("light.living"));
    const rendered = areasText();

    act(() => fake.set({ entities: { "light.living": { entity_id: "light.living", state: "on", attributes: {} } } }));

    expect(areasText()).toBe(rendered);
    expect(fake.callApi).toHaveBeenCalledTimes(4);
  });
});

describe("useHaRegistry direct read", () => {
  it("returns the typed registries", async () => {
    const fake = fakeStore();
    fake.callApi.mockImplementation(registries(entities({ ei: "light.living", ai: "living" })));
    fake.set({ status: "connected", generation: 1 });

    function RegistryProbe() {
      const registry = useHaRegistry();
      return <span data-testid="registry">{registry ? `${registry.areas.length}:${registry.floors.length}:${registry.entities.size}` : ""}</span>;
    }

    render(<HaProvider store={fake.store}><RegistryProbe /></HaProvider>);

    await waitFor(() => expect(screen.getByTestId("registry").textContent).toBe("3:1:1"));
  });
});

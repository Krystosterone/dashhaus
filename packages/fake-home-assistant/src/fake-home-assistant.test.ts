import { describe, expect, it } from "vitest";
import { FakeHomeAssistant, connectTo } from "./fake-home-assistant.js";
import type { FakeConnectionSeen } from "./fake-home-assistant.js";
import type { FakeEntityRegistryDisplay, FakeRegistries, FakeState } from "./house.js";

describe("FakeHomeAssistant", () => {
  it("starts from the sample house", async () => {
    const ha = new FakeHomeAssistant();
    expect(ha.version).toBe("2026.10.0");
    expect(ha.closed).toBe(false);
    expect((await ha.send("get_states")) as FakeState[]).toHaveLength(16);
  });

  it("records the Lovelace resources and can fail the read", async () => {
    const ha = new FakeHomeAssistant();
    expect(await ha.send("lovelace/resources")).toEqual([]);

    await ha.send("lovelace/resources/create", { url: "/local/x.js", res_type: "module" });
    await ha.send("lovelace/resources/create", { url: "/local/y.js", res_type: "module" });
    expect(ha.resources).toEqual([
      { id: "resource-1", url: "/local/x.js", type: "module" },
      { id: "resource-2", url: "/local/y.js", type: "module" },
    ]);

    await ha.send("lovelace/resources/update", { resource_id: "resource-2", url: "/local/z.js" });
    expect(ha.resources[1]?.url).toBe("/local/z.js");

    ha.failResources = true;
    await expect(ha.send("lovelace/resources")).rejects.toThrow("resources are YAML");
  });

  it("creates a dashboard once and updates its title", async () => {
    const ha = new FakeHomeAssistant();
    await ha.send("lovelace/dashboards/create", { url_path: "home-orb", title: "Home (Orb)", icon: "mdi:home-variant" });
    expect(ha.dashboards).toEqual([{ id: "dashboard-1", url_path: "home-orb", title: "Home (Orb)", icon: "mdi:home-variant" }]);
    await expect(ha.send("lovelace/dashboards/create", { url_path: "home-orb", title: "Again" })).rejects.toThrow("already exists");

    await ha.send("lovelace/dashboards/update", { dashboard_id: "dashboard-1", title: "Renamed" });
    expect(ha.dashboards[0]?.title).toBe("Renamed");
    expect(await ha.send("lovelace/dashboards/list")).toMatchObject([{ url_path: "home-orb", title: "Renamed" }]);
  });

  it("saves and reads a layout, replacing the same url_path", async () => {
    const ha = new FakeHomeAssistant();
    const config = { views: [{ type: "panel", cards: [{ type: "custom:dashhaus-orb" }] }] };
    await ha.send("lovelace/config/save", { url_path: "home-orb", config });
    expect(await ha.send("lovelace/config", { url_path: "home-orb" })).toEqual(config);

    await ha.send("lovelace/config/save", { url_path: "home-orb", config: { views: [] } });
    expect(ha.saved).toHaveLength(1);
    expect(await ha.send("lovelace/config", { url_path: "home-orb" })).toEqual({ views: [] });
    await expect(ha.send("lovelace/config", { url_path: "missing" })).rejects.toThrow("config_not_found");
  });

  it("changes states through call_service and tells listeners", async () => {
    const ha = new FakeHomeAssistant();
    const seen: FakeState[] = [];
    const stop = ha.onStateChange((state) => seen.push(state));

    await ha.send("call_service", { domain: "light", service: "toggle", target: { entity_id: "light.kitchen_ceiling" } });
    expect(ha.states["light.kitchen_ceiling"]?.state).toBe("off");
    expect(ha.states["light.kitchen_ceiling"]?.attributes.brightness).toBeNull();
    expect(seen.map((state) => state.state)).toEqual(["off"]);

    await ha.send("call_service", { domain: "light", service: "turn_on", target: { entity_id: "light.kitchen_ceiling" }, service_data: { brightness_pct: 50 } });
    expect(ha.states["light.kitchen_ceiling"]?.state).toBe("on");
    expect(ha.states["light.kitchen_ceiling"]?.attributes.brightness).toBe(127);
    expect(seen).toHaveLength(2);

    stop();
    await ha.send("call_service", { domain: "switch", service: "toggle", target: { entity_id: "switch.office_fan" } });
    expect(ha.states["switch.office_fan"]?.state).toBe("on");
    expect(seen).toHaveLength(2);

    await ha.send("call_service", { domain: "lock", service: "unlock", target: { entity_id: "lock.front_door" } });
    expect(ha.states["lock.front_door"]?.state).toBe("unlocked");
    await ha.send("call_service", { domain: "lock", service: "lock", target: { entity_id: "lock.front_door" } });
    expect(ha.states["lock.front_door"]?.state).toBe("locked");

    await ha.send("call_service", { domain: "climate", service: "set_temperature", target: { entity_id: "climate.living_room" }, service_data: { temperature: 22 } });
    expect(ha.states["climate.living_room"]?.state).toBe("heat");

    await expect(ha.send("call_service", { domain: "light", service: "toggle", target: { entity_id: "light.missing" } })).rejects.toThrow("Entity light.missing not found");
  });

  it("answers the registry commands", async () => {
    const ha = new FakeHomeAssistant();
    const display = (await ha.send("config/entity_registry/list_for_display")) as FakeEntityRegistryDisplay;
    expect(display.entities).toHaveLength(16);
    expect(display.entities).toContainEqual({ ei: "sensor.kitchen_temperature", ai: "kitchen", di: "kitchen_air" });
    expect(await ha.send("config/device_registry/list")).toHaveLength(4);
    expect(await ha.send("config/area_registry/list")).toHaveLength(4);
  });

  it("rejects an unknown command", async () => {
    const ha = new FakeHomeAssistant();
    await expect(ha.send("lovelace/nope")).rejects.toThrow("unexpected Home Assistant command lovelace/nope");
  });

  it("serves an injected house", async () => {
    const registries: FakeRegistries = {
      entities: { "light.injected": { entity_id: "light.injected", area_id: "den", device_id: "den_air", hidden: false, entity_category: null } },
      devices: { den_air: { id: "den_air", area_id: "den", name: "den air" } },
      areas: { den: { area_id: "den", name: "Den" } },
    };
    const ha = new FakeHomeAssistant({
      states: [{ entity_id: "light.injected", state: "on", attributes: { friendly_name: "Injected" } }],
      registries,
    });

    const [state] = (await ha.send("get_states")) as FakeState[];
    expect(state).toMatchObject({ entity_id: "light.injected", state: "on", last_changed: "2026-10-31T18:00:00Z", last_updated: "2026-10-31T18:00:00Z" });
    expect(state?.context).toEqual({ id: "fake", parent_id: null, user_id: null });
    expect(ha.entityRegistryForDisplay()).toEqual({ entity_categories: {}, entities: [{ ei: "light.injected", ai: "den", di: "den_air" }] });
    expect(ha.deviceRegistry()).toEqual([{ id: "den_air", area_id: "den", name: "den air" }]);
    expect(ha.areaRegistry()).toEqual([{ area_id: "den", name: "Den" }]);
  });

  it("turns into a connect callback through connectTo", async () => {
    const ha = new FakeHomeAssistant();
    const seen: FakeConnectionSeen = {};
    const connect = connectTo(ha, seen);
    expect(await connect("http://ha:8123", "token")).toBe(ha);
    expect(seen).toEqual({ url: "http://ha:8123", token: "token" });
  });

  it("marks itself closed", () => {
    const ha = new FakeHomeAssistant();
    ha.close();
    expect(ha.closed).toBe(true);
  });
});

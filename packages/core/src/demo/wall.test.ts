import { describe, expect, it } from "vitest";
import { areaName, areaOrder, dysonFans, visibleEntities } from "../lovelace/layout";
import { readRegistries } from "../ha/registry";
import type { HaTransport, HassEntities } from "../ha/types";
import { DEMO_WALL_HOUSE, DEMO_WALL_HOUSE_ORDERED, DEMO_WALL_HOUSE_WORST_CASE, DEMO_WALL_LONGEST_AREA, createDemoWallHouseTransport, demoWallInput } from "./wall";

async function entitiesOf(transport: HaTransport): Promise<HassEntities> {
  let latest: HassEntities = {};
  const stop = transport.subscribeEntities((entities) => { latest = entities; });
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  stop();
  return latest;
}

describe.each([["the everyday house", DEMO_WALL_HOUSE], ["the worst case", DEMO_WALL_HOUSE_WORST_CASE], ["the worst case, ordered", DEMO_WALL_HOUSE_ORDERED]])("the demo wall house: %s", (_name, house) => {
  it("answers the registries the layout reads, so a card's area and its column's agree", async () => {
    const transport = createDemoWallHouseTransport(house);
    const states = await entitiesOf(transport);
    const input = demoWallInput(states, house);
    const registry = readRegistries(
      await transport.sendMessage!("config/entity_registry/list_for_display"),
      await transport.sendMessage!("config/device_registry/list"),
      await transport.sendMessage!("config/area_registry/list"),
    );
    const names = new Map(registry.areas.map((area) => [area.id, area.name]));
    for (const entity of Object.keys(states)) {
      const id = registry.membership.get(entity);
      expect(id ? names.get(id) : undefined, entity).toBe(areaName(input, entity));
    }
    const hidden = [...registry.entities.values()].filter((entry) => entry.hidden).map((entry) => entry.entityId);
    expect(visibleEntities(input).filter((entity) => hidden.includes(entity))).toEqual([]);
  });
});

describe("the demo wall house", () => {
  it("keeps the demo house's entities, with the worst case's own states", async () => {
    const everyday = await entitiesOf(createDemoWallHouseTransport());
    const worst = await entitiesOf(createDemoWallHouseTransport(DEMO_WALL_HOUSE_WORST_CASE));
    expect(Object.keys(worst)).toEqual(Object.keys(everyday));
    expect(everyday["lock.back_door"].state).toBe("unlocked");
    expect(worst["lock.back_door"].state).toBe("jammed");
    expect(worst["binary_sensor.patio_door"].state).toBe("on");
  });

  it("registers the living room's Dyson, its fan and its heater, so the wall finds it there", async () => {
    const input = demoWallInput(await entitiesOf(createDemoWallHouseTransport()));
    expect(dysonFans(input)).toContainEqual({ fan: "fan.living_room_hot_cool", heat: "climate.living_room_hot_cool" });
    expect(areaName(input, "fan.living_room_hot_cool")).toBe("Living room");
    expect(areaName(input, "climate.living_room_hot_cool")).toBe("Living room");
  });

  it("has more rooms in the worst case, the longest name among them, and a room of one card", () => {
    expect(Object.keys(DEMO_WALL_HOUSE.areas)).toHaveLength(4);
    expect(Object.values(DEMO_WALL_HOUSE_WORST_CASE.areas)).toHaveLength(8);
    expect(Object.values(DEMO_WALL_HOUSE_WORST_CASE.areas)).toContain(DEMO_WALL_LONGEST_AREA);
    expect(Object.values(DEMO_WALL_HOUSE_WORST_CASE.devices).filter((device) => device.area === "hallway").flatMap((device) => device.entities)).toEqual(["binary_sensor.hallway_smoke"]);
  });

  it("gives the worst case its areas by name, as Home Assistant does until a person orders them, and the ordered house its own", async () => {
    const order = async (house: typeof DEMO_WALL_HOUSE) => areaOrder(demoWallInput(await entitiesOf(createDemoWallHouseTransport(house)), house));
    const worst = await order(DEMO_WALL_HOUSE_WORST_CASE);
    expect(worst).toEqual([...worst].sort((a, b) => a.localeCompare(b)));
    expect((await order(DEMO_WALL_HOUSE_ORDERED)).slice(0, 3)).toEqual(["Outside", "Living room", "Kitchen"]);
    expect(Object.keys(DEMO_WALL_HOUSE_ORDERED.areas).sort()).toEqual(Object.keys(DEMO_WALL_HOUSE_WORST_CASE.areas).sort());
  });
});

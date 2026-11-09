import { describe, expect, it } from "vitest";
import * as demo from "./index";
import type { HaTransport, HassEntities } from "../ha/types";

const settled = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function entityIds(transport: HaTransport): Promise<string[]> {
  let latest: HassEntities = {};
  const stop = transport.subscribeEntities((entities) => { latest = entities; });
  await settled();
  stop();
  return Object.keys(latest);
}

/** Every domain's demo transport, as the demo barrel exports it: `createDemo<Name>HaTransport`. */
const transports = Object.entries(demo)
  .filter(([name]) => /^createDemo\w*HaTransport$/.test(name) && name !== "createDemoHouseTransport")
  .map(([name, create]) => [name, create as () => HaTransport] as const);

describe("createDemoHouseTransport", () => {
  it("holds every entity of every domain's demo transport, so a card added to a skin has one to draw", async () => {
    expect(transports.length).toBeGreaterThan(10);
    const house = new Set(await entityIds(demo.createDemoHouseTransport()));
    for (const [name, create] of transports) {
      const missing = (await entityIds(create())).filter((id) => !house.has(id));
      expect(missing, `${name}'s entities aren't in the demo house: add it to house.ts`).toEqual([]);
    }
  });

  it("answers each entity's history from the part that owns it, so a part's own day isn't the generic one", async () => {
    const house = demo.createDemoHouseTransport();
    const stop = house.subscribeEntities(() => {});
    await settled();
    const ids = ["sensor.living_room_co2", "sensor.house_energy", "light.living_room", "sensor.nowhere"];
    const answer = await house.sendMessage!("history/history_during_period", { entity_ids: ids }) as Record<string, unknown>;
    stop();
    const numeric = await demo.createDemoNumericHaTransport().sendMessage!("history/history_during_period", { entity_ids: ids.slice(0, 2) }) as Record<string, unknown>;
    expect(answer["sensor.living_room_co2"]).toEqual(numeric["sensor.living_room_co2"]);
    expect(answer["sensor.house_energy"]).toEqual(numeric["sensor.house_energy"]);
    expect(answer["light.living_room"]).toBeDefined();
    expect(answer).not.toHaveProperty("sensor.nowhere");
  });

  it("resolves a picture no domain holds to nothing, so the demo house never fetches the network", () => {
    expect(demo.createDemoHouseTransport().resolveUrl?.("/api/camera_proxy/camera.nowhere?token=x")).toBeUndefined();
  });
});

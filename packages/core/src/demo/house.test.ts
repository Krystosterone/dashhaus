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
});

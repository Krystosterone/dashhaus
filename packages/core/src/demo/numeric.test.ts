import { describe, expect, it } from "vitest";
import { createDemoNumericHaTransport } from "./numeric";
import type { HassEntities } from "../ha/types";

describe("createDemoNumericHaTransport", () => {
  it("publishes the seeded readings", async () => {
    const transport = createDemoNumericHaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(latest).toMatchObject({ "sensor.living_room_co2": { state: "650" }, "sensor.house_energy": { state: "1523.3" }, "sensor.grid_power": { state: "-1240" } });
  });

  it("refuses every service: a reading is read-only", async () => {
    await expect(createDemoNumericHaTransport().callService("sensor", "toggle", { entity_id: "sensor.living_room_co2" })).rejects.toThrow(/read-only/);
  });

  it("answers today's history in each entity's own unit, and the registries", async () => {
    const transport = createDemoNumericHaTransport();
    const history = await transport.sendMessage?.("history/history_during_period", { entity_ids: ["sensor.living_room_co2", "sensor.house_energy"] }) as Record<string, Array<{ s: string }>>;
    expect(Object.keys(history)).toEqual(["sensor.living_room_co2", "sensor.house_energy"]);
    const co2 = history["sensor.living_room_co2"].map((row) => Number(row.s));
    expect(Math.min(...co2)).toBeGreaterThan(400);
    // A meter only climbs.
    const energy = history["sensor.house_energy"].map((row) => Number(row.s));
    expect(energy).toEqual([...energy].sort((a, b) => a - b));
    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: "sensor.living_room_co2" }));
  });
});

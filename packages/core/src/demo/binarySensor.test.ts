import { describe, expect, it } from "vitest";
import { createDemoBinarySensorHaTransport } from "./binarySensor";
import type { HassEntities } from "../ha/types";

describe("createDemoBinarySensorHaTransport", () => {
  it("publishes the seeded sensors and the door's battery", async () => {
    const transport = createDemoBinarySensorHaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(latest).toMatchObject({
      "binary_sensor.patio_door": { state: "off", attributes: { device_class: "door" } },
      "binary_sensor.bedroom_window": { state: "on" },
      "sensor.patio_door_battery": { state: "64" },
    });
  });

  it("refuses every service: a binary sensor is read-only", async () => {
    await expect(createDemoBinarySensorHaTransport().callService("binary_sensor", "toggle", { entity_id: "binary_sensor.patio_door" })).rejects.toThrow(/read-only/);
  });

  it("answers today's on/off history, ending as the sensor is now, and the registries", async () => {
    const transport = createDemoBinarySensorHaTransport();
    const history = await transport.sendMessage?.("history/history_during_period", { entity_ids: ["binary_sensor.bedroom_window"] });
    const states = (history as Record<string, Array<{ s: string }>>)["binary_sensor.bedroom_window"].map((row) => row.s);
    expect(new Set(states)).toEqual(new Set(["on", "off"]));
    expect(states.at(-1)).toBe("on");
    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: "binary_sensor.patio_door" }));
  });
});

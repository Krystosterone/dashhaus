import { describe, expect, it } from "vitest";
import { createDemoAlarmHaTransport } from "./alarm";
import type { HassEntities } from "../ha/types";

describe("createDemoAlarmHaTransport", () => {
  it("publishes the initial alarm entity", async () => {
    const transport = createDemoAlarmHaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(latest).toMatchObject({
      "alarm_control_panel.house": { state: "disarmed" },
    });
  });

  it("arms with code 1234 and mutates state", async () => {
    const transport = createDemoAlarmHaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await transport.callService("alarm_control_panel", "alarm_arm_away", {
      entity_id: "alarm_control_panel.house",
      code: "1234",
    });

    expect(latest?.["alarm_control_panel.house"]).toMatchObject({ state: "armed_away" });
  });

  it("rejects a wrong code with translation_key invalid_code", async () => {
    const transport = createDemoAlarmHaTransport();

    await expect(transport.callService("alarm_control_panel", "alarm_disarm", {
      entity_id: "alarm_control_panel.house",
      code: "9999",
    })).rejects.toMatchObject({ translation_key: "invalid_code" });
  });

  it("returns alarm history and resolves the entity registry", async () => {
    const transport = createDemoAlarmHaTransport();

    const result = await transport.sendMessage?.("history/history_during_period", { entity_ids: ["alarm_control_panel.house"] });

    expect(Object.keys(result as object)).toEqual(["alarm_control_panel.house"]);

    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: "alarm_control_panel.house" }));
  });
});

import { describe, expect, it } from "vitest";
import { createDemoDysonHaTransport } from "./dyson";
import type { HassEntities } from "../ha/types";

const subscribe = async () => {
  const transport = createDemoDysonHaTransport();
  const seen: { latest?: HassEntities } = {};
  transport.subscribeEntities((entities) => { seen.latest = entities; });
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  return { transport, seen };
};

describe("createDemoDysonHaTransport", () => {
  it("publishes the fans and the companions on their devices", async () => {
    const { seen } = await subscribe();
    expect(seen.latest).toMatchObject({
      "fan.bedroom_purifier": { state: "on" },
      "fan.living_room_hot_cool": { state: "on", attributes: { preset_mode: "Auto" } },
      "sensor.bedroom_purifier_pm_2_5": { state: "8" },
      "climate.living_room_hot_cool": { state: "heat" },
      "switch.bedroom_purifier_night_mode": { state: "off" },
    });
  });

  it("answers the fan's services, Auto clearing its speed and a speed leaving Auto", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("fan", "toggle", { entity_id: "fan.bedroom_purifier" });
    expect(seen.latest?.["fan.bedroom_purifier"].state).toBe("off");
    await transport.callService("fan", "set_preset_mode", { entity_id: "fan.bedroom_purifier", preset_mode: "Auto" });
    expect(seen.latest?.["fan.bedroom_purifier"]).toMatchObject({ state: "on", attributes: { preset_mode: "Auto", percentage: null } });
    await transport.callService("fan", "set_percentage", { entity_id: "fan.bedroom_purifier", percentage: 70 });
    expect(seen.latest?.["fan.bedroom_purifier"].attributes).toMatchObject({ preset_mode: "Normal", percentage: 70 });
  });

  it("aims hass-dyson's sliders: the centre keeps the width, the width the centre, the ends following", async () => {
    const { transport, seen } = await subscribe();
    const value = (name: string) => seen.latest?.[`number.living_room_hot_cool_oscillation_${name}`].state;
    await transport.callService("number", "set_value", { entity_id: "number.living_room_hot_cool_oscillation_center_angle", value: 120 });
    expect([value("center_angle"), value("angle"), value("low_angle"), value("high_angle")]).toEqual(["120", "0", "120", "120"]);
    await transport.callService("number", "set_value", { entity_id: "number.living_room_hot_cool_oscillation_angle", value: 90 });
    expect([value("center_angle"), value("angle"), value("low_angle"), value("high_angle")]).toEqual(["120", "90", "75", "165"]);
    expect(seen.latest?.["select.living_room_hot_cool_oscillation"].state).toBe("90°");
    expect(seen.latest?.["fan.living_room_hot_cool"].attributes.oscillating).toBe(true);
    await expect(transport.callService("number", "set_value", { entity_id: "number.living_room_hot_cool_oscillation_angle", value: 10 })).rejects.toThrow();
  });

  it("sets the sweep's angles, which starts it, and refuses impossible ones", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("fan", "oscillate", { entity_id: "fan.bedroom_purifier", oscillating: false });
    await transport.callService("dyson_local", "set_angle", { entity_id: "fan.bedroom_purifier", angle_low: 158, angle_high: 203 });
    expect(seen.latest?.["fan.bedroom_purifier"].attributes).toMatchObject({ angle_low: 158, angle_high: 203, oscillating: true });
    await expect(transport.callService("dyson_local", "set_angle", { entity_id: "fan.bedroom_purifier", angle_low: 0, angle_high: 400 })).rejects.toThrow();
  });

  it("switches night mode and the heater, whose heat switches the fan on", async () => {
    const { transport, seen } = await subscribe();
    await transport.callService("switch", "turn_on", { entity_id: "switch.bedroom_purifier_night_mode" });
    expect(seen.latest?.["switch.bedroom_purifier_night_mode"].state).toBe("on");
    await transport.callService("fan", "turn_off", { entity_id: "fan.living_room_hot_cool" });
    await transport.callService("climate", "set_hvac_mode", { entity_id: "climate.living_room_hot_cool", hvac_mode: "heat" });
    expect(seen.latest?.["fan.living_room_hot_cool"].state).toBe("on");
    await transport.callService("climate", "set_temperature", { entity_id: "climate.living_room_hot_cool", temperature: 25 });
    expect(seen.latest?.["climate.living_room_hot_cool"].attributes.temperature).toBe(25);
    await expect(transport.callService("climate", "set_temperature", { entity_id: "climate.living_room_hot_cool", temperature: 60 })).rejects.toThrow();
  });

  it("rejects other domains, services and unknown entities", async () => {
    const transport = createDemoDysonHaTransport();
    await expect(transport.callService("other_domain", "toggle", { entity_id: "fan.bedroom_purifier" })).rejects.toThrow();
    await expect(transport.callService("fan", "explode", { entity_id: "fan.bedroom_purifier" })).rejects.toThrow();
    await expect(transport.callService("fan", "toggle", { entity_id: "fan.missing" })).rejects.toThrow();
  });

  it("answers today's history and the registries", async () => {
    const transport = createDemoDysonHaTransport();
    const history = await transport.sendMessage?.("history/history_during_period", { entity_ids: ["fan.bedroom_purifier"] });
    expect(Object.keys(history as object)).toEqual(["fan.bedroom_purifier"]);
    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: "fan.bedroom_purifier" }));
  });
});

import { describe, expect, it } from "vitest";
import { createDemoClimateHaTransport, createDemoHaTransport, createDemoSensorHaTransport, createDemoWeatherHaTransport } from "../demo";
import type { HassEntities } from "./types";
import { areaNamesFromRegistries } from "./registry";

describe("createDemoClimateHaTransport", () => {
  it("keeps the readback action off when the HVAC mode is set to off", async () => {
    const transport = createDemoClimateHaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await transport.callService("climate", "set_hvac_mode", {
      entity_id: "climate.living_room",
      hvac_mode: "off",
    });

    expect(latest?.["climate.living_room"]).toMatchObject({
      state: "off",
      attributes: { hvac_action: "off" },
    });
  });
});

describe("createDemoHaTransport", () => {
  it("shows a colour or a colour temperature by color_mode, as a real lamp reports it", async () => {
    const transport = createDemoHaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await transport.callService("light", "turn_on", { entity_id: "light.living_room", hs_color: [220, 100] });
    expect(latest?.["light.living_room"]?.attributes).toMatchObject({ color_mode: "hs", hs_color: [220, 100] });

    await transport.callService("light", "turn_on", { entity_id: "light.living_room", color_temp_kelvin: 4000 });
    expect(latest?.["light.living_room"]?.attributes).toMatchObject({ color_mode: "color_temp", color_temp_kelvin: 4000 });
  });

  it("switches an input_boolean or a switch it was seeded with", async () => {
    const stamp = "2026-10-19T11:20:00Z";
    const seed: HassEntities = {
      "input_boolean.guest": { entity_id: "input_boolean.guest", state: "off", attributes: {}, last_changed: stamp, last_updated: stamp },
      "switch.fan": { entity_id: "switch.fan", state: "on", attributes: {}, last_changed: stamp, last_updated: stamp },
    };
    const transport = createDemoHaTransport(seed);
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await transport.callService("input_boolean", "toggle", { entity_id: "input_boolean.guest" });
    await transport.callService("switch", "turn_off", { entity_id: "switch.fan" });
    expect(latest?.["input_boolean.guest"]?.state).toBe("on");
    expect(latest?.["input_boolean.guest"]?.last_changed).not.toBe(stamp);
    expect(latest?.["switch.fan"]?.state).toBe("off");
  });

  it("runs a fan it was seeded with: speed, preset, sweep and direction", async () => {
    const stamp = "2026-10-19T11:20:00Z";
    const transport = createDemoHaTransport({
      "fan.office": { entity_id: "fan.office", state: "off", attributes: { percentage: 0, preset_modes: ["sleep"], oscillating: false, direction: "forward", supported_features: 1 | 2 | 4 | 8 }, last_changed: stamp, last_updated: stamp },
    });
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await transport.callService("fan", "set_percentage", { entity_id: "fan.office", percentage: 50 });
    expect(latest?.["fan.office"]).toMatchObject({ state: "on", attributes: { percentage: 50 } });
    expect(latest?.["fan.office"]?.last_changed).not.toBe(stamp);
    await transport.callService("fan", "set_preset_mode", { entity_id: "fan.office", preset_mode: "sleep" });
    await transport.callService("fan", "oscillate", { entity_id: "fan.office", oscillating: true });
    await transport.callService("fan", "set_direction", { entity_id: "fan.office", direction: "reverse" });
    expect(latest?.["fan.office"]?.attributes).toMatchObject({ preset_mode: "sleep", oscillating: true, direction: "reverse" });
    await transport.callService("fan", "toggle", { entity_id: "fan.office" });
    expect(latest?.["fan.office"]).toMatchObject({ state: "off", attributes: { percentage: 0 } });
    await expect(transport.callService("fan", "set_preset_mode", { entity_id: "fan.office", preset_mode: "turbo" })).rejects.toThrow();
  });

  it("switches a humidifier it was seeded with, and sets its target and mode", async () => {
    const stamp = "2026-10-19T11:20:00Z";
    const transport = createDemoHaTransport({
      "humidifier.bedroom": { entity_id: "humidifier.bedroom", state: "off", attributes: { humidity: 45, mode: "normal", available_modes: ["normal", "eco"] }, last_changed: stamp, last_updated: stamp },
    });
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await transport.callService("humidifier", "toggle", { entity_id: "humidifier.bedroom" });
    await transport.callService("humidifier", "set_humidity", { entity_id: "humidifier.bedroom", humidity: 50 });
    await transport.callService("humidifier", "set_mode", { entity_id: "humidifier.bedroom", mode: "eco" });
    expect(latest?.["humidifier.bedroom"]).toMatchObject({ state: "on", attributes: { humidity: 50, mode: "eco", action: "humidifying" } });
  });

  it("sets a sound's volume number it was seeded with, and leaves the sound as it was", async () => {
    const stamp = "2026-10-19T11:20:00Z";
    const transport = createDemoHaTransport({
      "switch.nursery_music": { entity_id: "switch.nursery_music", state: "off", attributes: {}, last_changed: stamp, last_updated: stamp },
      "number.nursery_volume": { entity_id: "number.nursery_volume", state: "40", attributes: { min: 0, max: 100, step: 1 }, last_changed: stamp, last_updated: stamp },
    });
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await transport.callService("number", "set_value", { entity_id: "number.nursery_volume", value: 55 });
    expect(latest?.["number.nursery_volume"]?.state).toBe("55");
    expect(latest?.["switch.nursery_music"]?.state).toBe("off");
  });

  it("moves a cover it was seeded with, and tilts its slats", async () => {
    const stamp = "2026-10-19T11:20:00Z";
    const transport = createDemoHaTransport({
      "cover.blind": { entity_id: "cover.blind", state: "closed", attributes: { current_position: 0, current_tilt_position: 50 }, last_changed: stamp, last_updated: stamp },
    });
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await transport.callService("cover", "set_cover_position", { entity_id: "cover.blind", position: 40 });
    await transport.callService("cover", "set_cover_tilt_position", { entity_id: "cover.blind", tilt_position: 80 });
    expect(latest?.["cover.blind"]).toMatchObject({ state: "open", attributes: { current_position: 40, current_tilt_position: 80 } });
    expect(latest?.["cover.blind"]?.last_changed).not.toBe(stamp);
    await transport.callService("cover", "close_cover", { entity_id: "cover.blind" });
    expect(latest?.["cover.blind"]).toMatchObject({ state: "closed", attributes: { current_position: 0 } });
  });
  it("arms and disarms an alarm it was seeded with, with the demo code where one is asked", async () => {
    const stamp = "2026-10-19T11:20:00Z";
    const transport = createDemoHaTransport({
      "alarm_control_panel.house": { entity_id: "alarm_control_panel.house", state: "disarmed", attributes: { code_format: "number", code_arm_required: false, supported_features: 1 | 2 }, last_changed: stamp, last_updated: stamp },
    });
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await transport.callService("alarm_control_panel", "alarm_arm_away", { entity_id: "alarm_control_panel.house" });
    expect(latest?.["alarm_control_panel.house"]?.state).toBe("armed_away");
    await expect(transport.callService("alarm_control_panel", "alarm_disarm", { entity_id: "alarm_control_panel.house", code: "0000" })).rejects.toEqual({ translation_key: "invalid_code" });
    await transport.callService("alarm_control_panel", "alarm_disarm", { entity_id: "alarm_control_panel.house", code: "1234" });
    expect(latest?.["alarm_control_panel.house"]?.state).toBe("disarmed");
  });
});

describe("createDemoSensorHaTransport", () => {
  it("publishes the composed temperature, humidity, and battery entities", async () => {
    const transport = createDemoSensorHaTransport();
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });

    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(latest).toMatchObject({
      "sensor.living_room_temperature": { state: "21.4" },
      "sensor.living_room_humidity": { state: "44" },
      "sensor.living_room_battery": { state: "82" },
    });
  });
});

describe("createDemoWeatherHaTransport", () => {
  it("returns forecast responses through the same service boundary", async () => {
    const transport = createDemoWeatherHaTransport();

    const response = await transport.callService("weather", "get_forecasts", { type: "daily" }, {
      target: { entity_id: "weather.home" },
      returnResponse: true,
    });

    expect(response).toMatchObject({
      response: {
        "weather.home": { forecast: expect.arrayContaining([expect.objectContaining({ condition: "sunny" })]) },
      },
    });
  });
});

describe("demo history and registry commands", () => {
  it("returns compressed rows keyed by entity id, like history/history_during_period", async () => {
    const transport = createDemoSensorHaTransport();

    const result = await transport.sendMessage?.("history/history_during_period", {
      entity_ids: ["sensor.living_room_temperature", "sensor.living_room_humidity"],
    }) as Record<string, Array<Record<string, unknown>>>;

    expect(Object.keys(result)).toEqual(["sensor.living_room_temperature", "sensor.living_room_humidity"]);
    expect(result["sensor.living_room_temperature"][0]).toEqual({ s: expect.any(String), a: expect.any(Object), lu: expect.any(Number) });
  });

  it("synthesizes domain attributes the history parsers need", async () => {
    const transport = createDemoHaTransport();

    const result = await transport.sendMessage?.("history/history_during_period", { entity_ids: ["light.living_room"] });
    const rows = (result as Record<string, Array<{ a: Record<string, unknown> }>>)["light.living_room"];

    expect(rows.some((row) => typeof row.a.brightness === "number")).toBe(true);
  });

  it("resolves an area through the entity, device and area registries", async () => {
    const transport = createDemoHaTransport();
    const send = (type: string) => transport.sendMessage?.(type);

    const names = areaNamesFromRegistries(
      await send("config/entity_registry/list_for_display"),
      await send("config/device_registry/list"),
      await send("config/area_registry/list"),
    );

    expect(names.get("light.living_room")).toBe("Living room");
    await expect(send("config/floor_registry/list")).resolves.toEqual([{ floor_id: "ground", name: "Ground floor", level: 0 }]);
  });

  it("leaves unknown history entities out and rejects unsupported commands", async () => {
    const transport = createDemoHaTransport();

    await expect(transport.sendMessage?.("history/history_during_period", { entity_ids: ["light.missing"] })).resolves.toEqual({});
    await expect(transport.sendMessage?.("config/something_else/list")).rejects.toThrow();
  });
});

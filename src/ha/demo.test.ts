import { describe, expect, it } from "vitest";
import { createDemoClimateHaTransport, createDemoHaTransport, createDemoSensorHaTransport, createDemoWeatherHaTransport } from "./demo";
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
  });

  it("leaves unknown history entities out and rejects unsupported commands", async () => {
    const transport = createDemoHaTransport();

    await expect(transport.sendMessage?.("history/history_during_period", { entity_ids: ["light.missing"] })).resolves.toEqual({});
    await expect(transport.sendMessage?.("config/something_else/list")).rejects.toThrow();
  });
});

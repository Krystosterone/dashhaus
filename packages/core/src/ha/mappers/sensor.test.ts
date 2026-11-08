import { describe, expect, it } from "vitest";
import { isRoomReading, sensorFromHass } from "./sensor";

const temperature = {
  entity_id: "sensor.living_room_temperature",
  state: "21.4",
  attributes: {
    friendly_name: "Living room temperature",
    device_class: "temperature",
    unit_of_measurement: "°C",
  },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:02Z",
};

const humidity = {
  entity_id: "sensor.living_room_humidity",
  state: "44",
  attributes: {
    friendly_name: "Living room humidity",
    device_class: "humidity",
    unit_of_measurement: "%",
  },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:02Z",
};

const battery = {
  entity_id: "sensor.living_room_battery",
  state: "82",
  attributes: {
    friendly_name: "Living room battery",
    device_class: "battery",
    unit_of_measurement: "%",
  },
  last_changed: "2026-10-19T10:00:00Z",
  last_updated: "2026-10-19T10:00:02Z",
};

describe("sensorFromHass", () => {
  it("composes temperature, humidity, battery, identity, and timestamps", () => {
    expect(sensorFromHass(temperature, temperature.entity_id, {
      area: "Living room",
      humidityEntity: humidity,
      batteryEntity: battery,
    })).toMatchObject({
      entityId: "sensor.living_room_temperature",
      name: "Living room temperature",
      area: "Living room",
      state: "ok",
      temperature: 21.4,
      humidity: 44,
      battery: 82,
      unit: "°C",
    });
    expect(sensorFromHass(temperature, temperature.entity_id).lastUpdated).toBeDefined();
  });

  it("maps Fahrenheit and outdoor metadata without converting the card reading", () => {
    const mapped = sensorFromHass({
      ...temperature,
      state: "70",
      attributes: { ...temperature.attributes, friendly_name: "Outside", unit_of_measurement: "°F" },
    }, "sensor.outside", { outdoor: true, name: "Outside", area: "Backyard" });

    expect(mapped).toMatchObject({
      entityId: "sensor.outside",
      name: "Outside",
      area: "Backyard",
      state: "ok",
      temperature: 70,
      unit: "°F",
      outdoor: true,
    });
  });

  it("keeps unknown and unavailable primary entities unavailable without stale readings", () => {
    const staleAttributes = {
      ...temperature.attributes,
      current_temperature: 19,
      current_humidity: 55,
      battery_level: 4,
      last_seen: "2026-10-19T08:20:00Z",
    };
    const unknown = sensorFromHass({ ...temperature, state: "unknown", attributes: staleAttributes }, temperature.entity_id, {
      humidityEntity: humidity,
      batteryEntity: battery,
    });
    const unavailable = sensorFromHass({ ...temperature, state: "unavailable", attributes: staleAttributes }, temperature.entity_id, {
      lastSeen: "08:20",
      humidityEntity: humidity,
      batteryEntity: battery,
    });
    const missing = sensorFromHass(undefined, "sensor.missing", { name: "Missing" });

    for (const mapped of [unknown, unavailable, missing]) {
      expect(mapped.state).toBe("unavailable");
      expect(mapped.temperature).toBeUndefined();
      expect(mapped.humidity).toBeUndefined();
      expect(mapped.battery).toBeUndefined();
    }
    expect(unavailable.lastSeen).toBe("08:20");
  });

  it("preserves a valid temperature-only reading and drops invalid companion values", () => {
    const mapped = sensorFromHass(temperature, temperature.entity_id, {
      humidityEntity: { ...humidity, state: "101" },
      batteryEntity: { ...battery, state: "not-a-number" },
    });

    expect(mapped.temperature).toBe(21.4);
    expect(mapped.humidity).toBeUndefined();
    expect(mapped.battery).toBeUndefined();
  });

  it("maps a humidity-only primary sensor when the explicit companion is valid", () => {
    const mapped = sensorFromHass(humidity, humidity.entity_id, { name: "Bathroom" });

    expect(mapped).toMatchObject({
      entityId: "sensor.living_room_humidity",
      name: "Bathroom",
      state: "ok",
      humidity: 44,
    });
    expect(mapped.temperature).toBeUndefined();
  });

  it("does not infer a temperature from an unrelated numeric sensor", () => {
    const mapped = sensorFromHass({
      ...temperature,
      state: "1013",
      attributes: { friendly_name: "Pressure", device_class: "pressure", unit_of_measurement: "hPa" },
    }, "sensor.pressure");

    expect(mapped.state).toBe("ok");
    expect(mapped.temperature).toBeUndefined();
    expect(mapped.humidity).toBeUndefined();
  });

  it("treats an explicit device class as authoritative over a contradictory unit", () => {
    const contradictoryTemperature = sensorFromHass({
      ...temperature,
      state: "21",
      attributes: { ...temperature.attributes, device_class: "pressure", unit_of_measurement: "°C" },
    }, "sensor.pressure");
    const contradictoryHumidity = sensorFromHass({
      ...humidity,
      attributes: { ...humidity.attributes, device_class: "temperature" },
    }, "sensor.temperature");
    const contradictoryBattery = sensorFromHass({
      ...battery,
      attributes: { ...battery.attributes, device_class: "humidity" },
    }, "sensor.humidity");

    expect(contradictoryTemperature.temperature).toBeUndefined();
    expect(contradictoryHumidity.humidity).toBeUndefined();
    expect(contradictoryBattery.battery).toBeUndefined();
  });

  it("fails closed for malformed raw and companion shapes", () => {
    const malformedPrimary = sensorFromHass({ ...temperature, state: 21 as unknown as string, attributes: null as unknown as typeof temperature.attributes }, temperature.entity_id);
    const malformedCompanions = sensorFromHass(temperature, temperature.entity_id, {
      humidityEntity: { ...humidity, attributes: null as unknown as typeof humidity.attributes },
      batteryEntity: { ...battery, state: 82 as unknown as string, attributes: null as unknown as typeof battery.attributes },
    });

    expect(malformedPrimary.state).toBe("unavailable");
    expect(malformedPrimary.temperature).toBeUndefined();
    expect(malformedCompanions.humidity).toBeUndefined();
    expect(malformedCompanions.battery).toBeUndefined();
  });

  it("does not convert a whitespace-only state into a numeric reading", () => {
    const mapped = sensorFromHass({ ...temperature, state: "   " }, temperature.entity_id);

    expect(mapped.state).toBe("ok");
    expect(mapped.temperature).toBeUndefined();
  });
});

describe("isRoomReading", () => {
  const room = [
    { device_class: "temperature", unit_of_measurement: "°C" },
    { device_class: "humidity", unit_of_measurement: "%" },
    { unit_of_measurement: "°F" },
    { native_unit_of_measurement: "celsius" },
    { unit_of_measurement: "%" },
  ];
  const other = [
    { device_class: "carbon_dioxide", unit_of_measurement: "ppm" },
    { device_class: "battery", unit_of_measurement: "%" },
    { device_class: "power", unit_of_measurement: "W" },
    { unit_of_measurement: "W" },
    {},
  ];

  it("holds for a temperature or humidity class, or no class with °C, °F or %, and only those", () => {
    for (const attributes of room) expect(isRoomReading(attributes), JSON.stringify(attributes)).toBe(true);
    for (const attributes of other) expect(isRoomReading(attributes), JSON.stringify(attributes)).toBe(false);
    expect(isRoomReading(undefined)).toBe(false);
  });

  it("holds only for readings this mapper draws as a temperature or a humidity", () => {
    for (const attributes of room) {
      const sensor = sensorFromHass({ entity_id: "sensor.room", state: "21", attributes }, "sensor.room");
      expect(sensor.temperature ?? sensor.humidity, JSON.stringify(attributes)).toBe(21);
    }
  });
});

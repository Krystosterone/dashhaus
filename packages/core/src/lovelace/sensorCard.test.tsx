import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { HaProvider, createHaStore } from "../index";
import type { HassEntities } from "../index";
import { sensorCard, useSensorCard } from "./sensorCard";

const state = (attributes: Record<string, unknown>) => ({ attributes });

describe("sensorCard", () => {
  it("keeps the room sensor for a room reading: a temperature or humidity class, or no class with °C, °F or %", () => {
    expect(sensorCard(state({ device_class: "temperature", unit_of_measurement: "°C", state_class: "measurement" }))).toBe("sensor");
    expect(sensorCard(state({ device_class: "humidity", unit_of_measurement: "%", state_class: "measurement" }))).toBe("sensor");
    expect(sensorCard(state({ unit_of_measurement: "°C" }))).toBe("sensor");
    expect(sensorCard(state({ unit_of_measurement: "°F", state_class: "measurement" }))).toBe("sensor");
    expect(sensorCard(state({ unit_of_measurement: "%" }))).toBe("sensor");
  });

  it("draws numeric for a sensor that declares a number: a device class, a unit or a state class", () => {
    expect(sensorCard(state({ device_class: "carbon_dioxide", unit_of_measurement: "ppm", state_class: "measurement" }))).toBe("numeric");
    expect(sensorCard(state({ device_class: "power", unit_of_measurement: "W" }))).toBe("numeric");
    expect(sensorCard(state({ device_class: "battery", unit_of_measurement: "%" })), "a battery's % is not the room's humidity").toBe("numeric");
    expect(sensorCard(state({ unit_of_measurement: "W" })), "a unit with no class").toBe("numeric");
    expect(sensorCard(state({ state_class: "total_increasing" })), "a state class alone").toBe("numeric");
    expect(sensorCard(state({ device_class: "signal_strength" })), "a numeric class with no unit").toBe("numeric");
  });

  it("keeps the room sensor for a text sensor, and for no state at all", () => {
    expect(sensorCard(state({ device_class: "enum", options: ["idle", "running"] }))).toBe("sensor");
    expect(sensorCard(state({ device_class: "timestamp" }))).toBe("sensor");
    expect(sensorCard(state({ device_class: "date" }))).toBe("sensor");
    expect(sensorCard(state({ friendly_name: "Washer status" })), "no unit and no state class").toBe("sensor");
    expect(sensorCard(state({ unit_of_measurement: "" })), "an empty unit declares nothing").toBe("sensor");
    expect(sensorCard(undefined), "a missing entity").toBe("sensor");
    expect(sensorCard({}), "no attributes").toBe("sensor");
  });

  it("reads only what the entity declares, so an unavailable reading keeps its card", () => {
    const attributes = { device_class: "carbon_dioxide", unit_of_measurement: "ppm" };
    const unavailable = { entity_id: "sensor.office_co2", state: "unavailable", attributes };
    const reading = { ...unavailable, state: "812" };
    expect(sensorCard(unavailable)).toBe("numeric");
    expect(sensorCard(reading)).toBe("numeric");
  });
});

describe("useSensorCard", () => {
  it("is the room sensor until the entity arrives, then follows its attributes", async () => {
    const entities: HassEntities = {
      "sensor.office_co2": { entity_id: "sensor.office_co2", state: "812", attributes: { device_class: "carbon_dioxide", unit_of_measurement: "ppm" } },
      "sensor.office_temperature": { entity_id: "sensor.office_temperature", state: "21.4", attributes: { device_class: "temperature", unit_of_measurement: "°C" } },
    };
    let push: ((next: HassEntities) => void) | undefined;
    const store = createHaStore({
      subscribeEntities(listener) { push = listener; return () => undefined; },
      callService: async () => undefined,
    });
    const wrapper = ({ children }: { children: ReactNode }) => <HaProvider store={store}>{children}</HaProvider>;
    const co2 = renderHook(() => useSensorCard("sensor.office_co2"), { wrapper });
    const temperature = renderHook(() => useSensorCard("sensor.office_temperature"), { wrapper });
    expect(co2.result.current).toBe("sensor");
    await waitFor(() => expect(push).toBeDefined());
    act(() => push!(entities));
    expect(co2.result.current).toBe("numeric");
    expect(temperature.result.current).toBe("sensor");
  });
});

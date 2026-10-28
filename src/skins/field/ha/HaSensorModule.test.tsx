import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HaSensorModule } from "./HaSensorModule";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import type { HaTransport, HassEntities, HassEntity } from "../../../ha/types";

const stamp = "2026-10-19T10:00:00Z";
const sensor = (entity_id: string, state: string, attributes: Record<string, unknown>): HassEntity => ({ entity_id, state, attributes, last_changed: stamp, last_updated: stamp });

const raw: HassEntities = {
  "sensor.living_room_temperature": sensor("sensor.living_room_temperature", "21.4", { friendly_name: "Living room", device_class: "temperature", unit_of_measurement: "°C" }),
  "sensor.living_room_humidity": sensor("sensor.living_room_humidity", "44", { device_class: "humidity", unit_of_measurement: "%" }),
  "sensor.living_room_battery": sensor("sensor.living_room_battery", "82", { device_class: "battery", unit_of_measurement: "%" }),
};

function transport() {
  let listener: ((entities: HassEntities) => void) | undefined;
  const value: HaTransport = {
    subscribeEntities(next) {
      listener = next;
      queueMicrotask(() => next(raw));
      return () => { listener = undefined; };
    },
    callService: async () => undefined,
  };
  return { value, emit: (entities: HassEntities) => listener?.(entities) };
}

function renderLive() {
  const fake = transport();
  const { container } = render(
    <HaProvider store={createHaStore(fake.value)}>
      <HaSensorModule entityId="sensor.living_room_temperature" humidityEntityId="sensor.living_room_humidity" batteryEntityId="sensor.living_room_battery" loadHistory={false} />
    </HaProvider>,
  );
  return { fake, container };
}

describe("HaSensorModule", () => {
  it("reads the temperature with its humidity companion onto the module's screen", async () => {
    const { container } = renderLive();
    await waitFor(() => expect(container.querySelector(".fd-read")?.textContent).toBe("21.4°C"));
    expect(container.querySelector(".fd-meta")?.textContent).toBe("44% RHComfortable");
    expect(screen.getByRole("heading", { name: "Living room" })).toBeTruthy();
  });

  it("warns when the battery companion runs low, and blanks the screen when the sensor stops answering", async () => {
    const { fake, container } = renderLive();
    await waitFor(() => expect(container.querySelector(".fd-read")?.textContent).toBe("21.4°C"));

    act(() => fake.emit({ ...raw, "sensor.living_room_battery": { ...raw["sensor.living_room_battery"], state: "9" } }));
    await waitFor(() => expect(container.querySelector(".fd-area")?.textContent).toBe("Warning: Battery 9%"));

    act(() => fake.emit({ ...raw, "sensor.living_room_temperature": { ...raw["sensor.living_room_temperature"], state: "unavailable" } }));
    await waitFor(() => expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----"));
  });
});

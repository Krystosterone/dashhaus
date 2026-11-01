import { act, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useHaEntity } from "./ha/provider";
import type { HassEntities } from "./ha/types";
import { fakeTransport, renderConnected } from "./testing";

const entities: HassEntities = {
  "light.desk": {
    entity_id: "light.desk",
    state: "off",
    attributes: { friendly_name: "Desk", brightness: 0 },
    last_updated: "2026-10-19T10:00:00Z",
  },
  "switch.router": { entity_id: "switch.router", state: "on", attributes: { friendly_name: "Router" } },
};

function Desk() {
  const desk = useHaEntity("light.desk");
  const router = useHaEntity("switch.router");
  return <span data-testid="desk">{`${desk?.state}|${String(desk?.attributes.brightness)}|${router?.state}`}</span>;
}

describe("fakeTransport", () => {
  it("serves the map, then re-renders a card from a patched entity", async () => {
    const fake = renderConnected(<Desk />, entities);

    await waitFor(() => expect(screen.getByTestId("desk").textContent).toBe("off|0|on"));

    act(() => fake.emitEntity("light.desk", { state: "on", attributes: { brightness: 180 } }));

    await waitFor(() => expect(screen.getByTestId("desk").textContent).toBe("on|180|on"));
  });

  it("patches one entity and keeps the others' identity", async () => {
    const fake = fakeTransport(entities);
    const listener = vi.fn<(next: HassEntities) => void>();
    const stop = fake.transport.subscribeEntities(listener);
    await Promise.resolve();

    const before = listener.mock.calls.at(-1)?.[0];
    fake.emitEntity("light.desk", { state: "on", attributes: { brightness: 180 } });
    const next = listener.mock.calls.at(-1)?.[0];

    expect(next?.["light.desk"]).toMatchObject({ state: "on", attributes: { friendly_name: "Desk", brightness: 180 } });
    expect(next?.["switch.router"]).toBe(before?.["switch.router"]);
    stop();
  });

  it("records typed service calls, options included", async () => {
    const fake = fakeTransport(entities);
    await fake.transport.callService("light", "turn_on", { entity_id: "light.desk" }, { target: { entity_id: "light.desk" }, returnResponse: true });

    expect(fake.calls).toEqual([{
      domain: "light",
      service: "turn_on",
      data: { entity_id: "light.desk" },
      options: { target: { entity_id: "light.desk" }, returnResponse: true },
    }]);
    expect(fake.callService).toHaveBeenCalledTimes(1);
  });

  it("creates an entity that is not there yet when patched", async () => {
    const fake = fakeTransport({});
    const listener = vi.fn<(next: HassEntities) => void>();
    const stop = fake.transport.subscribeEntities(listener);

    fake.emitEntity("sensor.new", { state: "21.5", attributes: { device_class: "temperature" } });

    expect(listener).toHaveBeenLastCalledWith({
      "sensor.new": {
        entity_id: "sensor.new",
        state: "21.5",
        attributes: { device_class: "temperature" },
      },
    });
    stop();
  });
});

import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import { createDemoTransport } from "./transport";
import type { DemoChange, DemoService, DemoServices } from "./transport";

const stamp = "2026-10-19T11:20:00Z";
const initial: HassEntities = {
  "humidifier.bedroom": {
    entity_id: "humidifier.bedroom",
    state: "on",
    attributes: { friendly_name: "Bedroom", device_class: "humidifier", action: "humidifying", current_humidity: 38, humidity: 45, min_humidity: 30, max_humidity: 80, mode: "normal", available_modes: ["normal", "eco", "sleep", "boost"] },
    last_changed: stamp,
    last_updated: stamp,
  },
  "humidifier.office": {
    entity_id: "humidifier.office",
    state: "off",
    attributes: { friendly_name: "Office", device_class: "dehumidifier", action: "off", current_humidity: 58, humidity: 50, min_humidity: 35, max_humidity: 70 },
    last_changed: stamp,
    last_updated: stamp,
  },
};

type Attributes = HassEntity["attributes"];

/**
 * A humidifier works below its target, a dehumidifier above it. Without both readings it is taken to be working, as
 * a device that reports neither does.
 */
function action(state: string, a: Attributes) {
  if (state !== "on") return "off";
  const cur = a.current_humidity, target = a.humidity;
  const dry = a.device_class === "dehumidifier";
  if (typeof cur !== "number" || typeof target !== "number") return dry ? "drying" : "humidifying";
  if (dry) return cur > target ? "drying" : "idle";
  return cur < target ? "humidifying" : "idle";
}

/** A service's change, with the action it leaves the humidifier in. */
const acting = (change: (call: Parameters<DemoService>[0]) => DemoChange): DemoService => (call) => {
  const { state = call.entity.state, attributes } = change(call);
  return { state, attributes: { ...attributes, action: action(state, { ...call.entity.attributes, ...attributes }) } };
};

/** What a humidifier's services do. */
export const HUMIDIFIER_SERVICES: DemoServices = {
  "humidifier.toggle": acting(({ entity }) => ({ state: entity.state === "on" ? "off" : "on" })),
  "humidifier.turn_on": acting(() => ({ state: "on" })),
  "humidifier.turn_off": acting(() => ({ state: "off" })),
  "humidifier.set_humidity": acting(({ data }) => {
    if (typeof data.humidity !== "number") throw new Error("humidity must be a number");
    return { attributes: { humidity: data.humidity } };
  }),
  "humidifier.set_mode": acting(({ data }) => ({ attributes: { mode: data.mode } })),
};

/** Storybook-only `humidifier` transport: the same store and service path as a host transport, answered locally. */
export function createDemoHumidifierHaTransport(seed: HassEntities = initial): HaTransport {
  return createDemoTransport({ seed, services: HUMIDIFIER_SERVICES });
}

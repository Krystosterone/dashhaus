import type { HaTransport, HassEntities, HassEntity } from "../ha/types";
import { createDemoTransport } from "./transport";
import type { DemoChange, DemoServices } from "./transport";

const stamp = "2026-10-19T11:20:00Z";
/** `FanEntityFeature`: speed 1, oscillate 2, direction 4, preset 8, turn off 16, turn on 32. */
const initial: HassEntities = {
  "fan.living_room_ceiling": {
    entity_id: "fan.living_room_ceiling",
    state: "on",
    attributes: { friendly_name: "Ceiling fan", percentage: 40, percentage_step: 1, direction: "forward", supported_features: 1 | 4 | 16 | 32 },
    last_changed: stamp,
    last_updated: stamp,
  },
  "fan.bedroom": {
    entity_id: "fan.bedroom",
    state: "off",
    attributes: { friendly_name: "Tower fan", percentage: 0, percentage_step: 100 / 3, preset_mode: null, preset_modes: ["normal", "sleep", "nature"], oscillating: false, supported_features: 1 | 2 | 8 | 16 | 32 },
    last_changed: stamp,
    last_updated: stamp,
  },
  "fan.bathroom_extractor": {
    entity_id: "fan.bathroom_extractor",
    state: "off",
    attributes: { friendly_name: "Extractor", supported_features: 16 | 32 },
    last_changed: stamp,
    last_updated: stamp,
  },
};

/** `FanEntityFeature.SET_SPEED`. */
const SPEED = 1;
type Fan = Pick<HassEntity, "entity_id" | "attributes">;

/**
 * What a fan's services do, as most integrations answer. Each fan remembers the speed it last ran at, so turning it
 * back on resumes there. Data Home Assistant would refuse throws.
 */
export function fanServices(): DemoServices {
  const last = new Map<string, number>();
  const off = ({ entity_id, attributes: a }: Fan): DemoChange => {
    if (typeof a.percentage === "number" && a.percentage > 0) last.set(entity_id, a.percentage);
    return { state: "off", attributes: { percentage: 0, preset_mode: null } };
  };
  const running = (id: string, change: DemoChange): DemoChange => {
    const percentage = change.attributes?.percentage;
    if (typeof percentage === "number" && percentage > 0) last.set(id, percentage);
    return change;
  };
  const on = (entity: Fan): DemoChange => {
    const a = entity.attributes;
    const was = last.get(entity.entity_id) ?? (typeof a.percentage === "number" && a.percentage > 0 ? a.percentage : undefined);
    return running(entity.entity_id, { state: "on", attributes: (Number(a.supported_features) & SPEED) !== 0 ? { percentage: was ?? 100 } : {} });
  };
  return {
    "fan.toggle": ({ entity }) => (entity.state === "on" ? off(entity) : on(entity)),
    "fan.turn_on": ({ entity }) => on(entity),
    "fan.turn_off": ({ entity }) => off(entity),
    "fan.set_percentage": ({ entity, data }) => {
      const percentage = data.percentage;
      if (typeof percentage !== "number" || percentage < 0 || percentage > 100) throw new Error("percentage must be 0-100");
      return percentage === 0 ? off(entity) : running(entity.entity_id, { state: "on", attributes: { percentage, preset_mode: null } });
    },
    "fan.set_preset_mode": ({ entity, data }) => {
      const modes = Array.isArray(entity.attributes.preset_modes) ? entity.attributes.preset_modes : [];
      if (typeof data.preset_mode !== "string" || !modes.includes(data.preset_mode)) throw new Error("preset_mode is not one of the fan's presets");
      return { state: "on", attributes: { preset_mode: data.preset_mode } };
    },
    "fan.oscillate": ({ data }) => {
      if (typeof data.oscillating !== "boolean") throw new Error("oscillating must be a boolean");
      return { attributes: { oscillating: data.oscillating } };
    },
    "fan.set_direction": ({ data }) => {
      if (data.direction !== "forward" && data.direction !== "reverse") throw new Error("direction must be forward or reverse");
      return { attributes: { direction: data.direction } };
    },
  };
}

/** Storybook-only `fan` transport: the same store and service path as a host transport, answered locally. */
export function createDemoFanHaTransport(seed: HassEntities = initial): HaTransport {
  return createDemoTransport({ seed, services: fanServices() });
}

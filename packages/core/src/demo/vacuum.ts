import type { HaTransport, HassEntities } from "../ha/types";
import { createDemoTransport } from "./transport";
import type { DemoServices } from "./transport";

const stamp = "2026-10-19T11:20:00Z";
/** `VacuumEntityFeature`: pause 4, stop 8, return home 16, fan speed 32, battery 64, status 128, locate 512, start 8192. */
const ALL = 4 | 8 | 16 | 32 | 64 | 128 | 512 | 8192;

const initial: HassEntities = {
  "vacuum.robot_vacuum": {
    entity_id: "vacuum.robot_vacuum",
    state: "docked",
    attributes: { friendly_name: "Robot vacuum", battery_level: 100, battery_icon: "mdi:battery", fan_speed: "standard", fan_speed_list: ["quiet", "standard", "strong", "turbo"], status: "Charging completed", supported_features: ALL },
    last_changed: stamp,
    last_updated: stamp,
  },
  "vacuum.upstairs_vacuum": {
    entity_id: "vacuum.upstairs_vacuum",
    state: "cleaning",
    attributes: { friendly_name: "Upstairs vacuum", battery_level: 58, battery_icon: "mdi:battery-50", supported_features: 4 | 16 | 64 | 8192 },
    last_changed: stamp,
    last_updated: stamp,
  },
};

export interface DemoVacuumOptions {
  /** How long the way back to the dock takes, in ms; it says Returning meanwhile. 0 goes straight there. */
  travelMs?: number;
}

/** What a vacuum's services do, as most integrations answer: what it doesn't support, or can't do now, throws. */
export function vacuumServices(travelMs = 2400): DemoServices {
  const live = (state: string) => {
    if (state === "unavailable" || state === "unknown") throw new Error("Demo vacuum is unavailable");
  };
  const supports = (features: unknown, bit: number, what: string) => {
    if ((Number(features) & bit) === 0) throw new Error(`Demo vacuum doesn't ${what}`);
  };
  return {
    "vacuum.start": ({ entity: { state, attributes } }) => {
      live(state);
      supports(attributes.supported_features, 8192, "start");
      return { state: "cleaning", attributes: { status: "Cleaning", error: null } };
    },
    "vacuum.pause": ({ entity: { state, attributes } }) => {
      live(state);
      supports(attributes.supported_features, 4, "pause");
      return { state: "paused", attributes: { status: "Paused" } };
    },
    "vacuum.return_to_base": ({ entity: { state, attributes }, later }) => {
      live(state);
      supports(attributes.supported_features, 16, "return to base");
      const docked = { state: "docked", attributes: { status: "Charging", battery_icon: "mdi:battery-charging-60" } };
      if (travelMs <= 0) return docked;
      later(docked, travelMs);
      return { state: "returning", attributes: { status: "Returning home", error: null } };
    },
    "vacuum.locate": ({ entity: { state, attributes } }) => {
      live(state);
      supports(attributes.supported_features, 512, "locate");
      return {};
    },
    "vacuum.set_fan_speed": ({ entity: { state, attributes }, data }) => {
      live(state);
      supports(attributes.supported_features, 32, "take a fan speed");
      const speeds = Array.isArray(attributes.fan_speed_list) ? attributes.fan_speed_list : [];
      if (typeof data.fan_speed !== "string" || !speeds.includes(data.fan_speed)) throw new Error("fan_speed is not one of the vacuum's speeds");
      return { attributes: { fan_speed: data.fan_speed } };
    },
  };
}

/** Storybook-only `vacuum` transport: the same store and service path as a host transport, answered locally. */
export function createDemoVacuumHaTransport(seed: HassEntities = initial, { travelMs = 2400 }: DemoVacuumOptions = {}): HaTransport {
  return createDemoTransport({ seed, services: vacuumServices(travelMs) });
}

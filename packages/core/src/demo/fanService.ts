import type { HassEntity } from "../ha/types";

type Attributes = HassEntity["attributes"];
/** `FanEntityFeature.SET_SPEED`. */
const SPEED = 1;

/**
 * What one `fan.*` service does to a demo fan: its next state and the attributes it changes, as most integrations
 * answer. `last` is the speed it last ran at, so turning it back on resumes there. Throws on a service or data Home
 * Assistant would refuse. Shared by the fan transport and the mixed demo transport, so neither forks it.
 */
export function fanService(current: HassEntity, service: string, data: Record<string, unknown>, last?: number): [string, Partial<Attributes>] {
  const a = current.attributes;
  const off = (): [string, Partial<Attributes>] => ["off", { percentage: 0, preset_mode: null }];
  const on = (): [string, Partial<Attributes>] => ["on", (Number(a.supported_features) & SPEED) !== 0 ? { percentage: last ?? 100 } : {}];
  switch (service) {
    case "toggle": return current.state === "on" ? off() : on();
    case "turn_on": return on();
    case "turn_off": return off();
    case "set_percentage": {
      const percentage = data.percentage;
      if (typeof percentage !== "number" || percentage < 0 || percentage > 100) throw new Error("percentage must be 0-100");
      return percentage === 0 ? off() : ["on", { percentage, preset_mode: null }];
    }
    case "set_preset_mode": {
      const modes = Array.isArray(a.preset_modes) ? a.preset_modes : [];
      if (typeof data.preset_mode !== "string" || !modes.includes(data.preset_mode)) throw new Error("preset_mode is not one of the fan's presets");
      return ["on", { preset_mode: data.preset_mode }];
    }
    case "oscillate":
      if (typeof data.oscillating !== "boolean") throw new Error("oscillating must be a boolean");
      return [current.state, { oscillating: data.oscillating }];
    case "set_direction":
      if (data.direction !== "forward" && data.direction !== "reverse") throw new Error("direction must be forward or reverse");
      return [current.state, { direction: data.direction }];
    default: throw new Error(`Unsupported demo service: fan.${service}`);
  }
}

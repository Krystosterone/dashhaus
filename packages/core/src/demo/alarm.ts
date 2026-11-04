import type { HaTransport, HassEntities } from "../ha/types";
import { createDemoTransport } from "./transport";
import type { DemoService, DemoServices } from "./transport";

const stamp = "2026-10-19T11:20:00Z";
const alarmInitial: HassEntities = {
  "alarm_control_panel.house": {
    entity_id: "alarm_control_panel.house",
    state: "disarmed",
    attributes: {
      friendly_name: "House alarm",
      code_format: "number",
      changed_by: null,
      supported_features: 1 | 2 | 4,
    },
    last_changed: stamp,
    last_updated: stamp,
  },
};

/** The code the demo alarms take. */
const CODE = "1234";

/**
 * As the manual alarm: the code is asked to disarm and, unless `code_arm_required` is false, to arm, wherever the
 * alarm has a `code_format`; a wrong one is refused with `translation_key: invalid_code`. It arms at once.
 */
const arm = (to: string): DemoService => ({ entity, data }) => {
  const asked = entity.attributes.code_format != null && (to === "disarmed" || entity.attributes.code_arm_required !== false);
  if (asked && data.code !== CODE) throw { translation_key: "invalid_code" };
  return { state: to, attributes: { next_state: undefined, changed_by: null } };
};

/** What an alarm's services do. */
export const ALARM_SERVICES: DemoServices = Object.fromEntries([
  ["alarm_disarm", "disarmed"],
  ...["home", "away", "night", "vacation", "custom_bypass"].map((mode) => [`alarm_arm_${mode}`, `armed_${mode}`]),
].map(([service, to]) => [`alarm_control_panel.${service}`, arm(to)]));

/**
 * Storybook-only alarm transport using the same store and service path as a host transport. It behaves like
 * the manual alarm: code 1234 arms and disarms; any other code is rejected with `translation_key: invalid_code`.
 */
export function createDemoAlarmHaTransport(seed: HassEntities = alarmInitial): HaTransport {
  return createDemoTransport({ seed, services: ALARM_SERVICES });
}

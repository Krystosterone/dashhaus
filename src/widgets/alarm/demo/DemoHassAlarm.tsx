import { useMemo, useState } from "react";
import { AlarmTile } from "../AlarmTile";
import { alarmFromHass, alarmHandlers } from "../hass";
import type { HassAlarmState, HassLike } from "../hass";

const ID = "alarm_control_panel.house";

/**
 * The widget fed exactly as a Home Assistant card would feed it: a raw state object through alarmFromHass,
 * and service calls through alarmHandlers. The fake `hass` behaves like the manual alarm: code 1234,
 * a 30 s exit delay for Away, and a wrong code rejected with ServiceValidationError. `fail` makes every
 * call fail instead, as when the connection drops.
 */
export function DemoHassAlarm({ width, fail }: { width?: number; fail?: boolean }) {
  const [st, setSt] = useState<HassAlarmState>(() => ({
    entity_id: ID,
    state: "disarmed",
    last_changed: new Date(Date.now() - 3 * 3600_000).toISOString(),
    attributes: { friendly_name: "House alarm", code_format: "number", changed_by: null, supported_features: 1 | 2 | 4 },
  }));
  const hass = useMemo<HassLike>(() => ({
    states: { [ID]: st },
    callService: async (_domain, service, data) => {
      await new Promise((r) => setTimeout(r, 350));
      if (fail) throw { code: "home_assistant_error", message: "Connection lost" };
      if (data?.code !== "1234") throw { code: "service_validation_error", message: "Invalid alarm code provided", translation_key: "invalid_code" };
      const now = new Date().toISOString();
      const to = service === "alarm_disarm" ? "disarmed" : service.replace("alarm_arm_", "armed_");
      if (to === "armed_away") {
        setSt((s) => ({ ...s, state: "arming", last_changed: now, attributes: { ...s.attributes, next_state: "armed_away", previous_state: s.state, changed_by: null } }));
        setTimeout(() => setSt((s) => (s.state === "arming" ? { ...s, state: "armed_away", last_changed: new Date().toISOString(), attributes: { ...s.attributes, next_state: undefined } } : s)), 30_000);
      } else {
        setSt((s) => ({ ...s, state: to, last_changed: now, attributes: { ...s.attributes, next_state: undefined } }));
      }
      return undefined;
    },
  }), [st, fail]);

  const entity = alarmFromHass(hass.states[ID], ID, { area: "Whole home", exitDelay: 30, entryDelay: 30 });
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <AlarmTile entity={entity} {...alarmHandlers(hass, ID)} />
    </div>
  );
}

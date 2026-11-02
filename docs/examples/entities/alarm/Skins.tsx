import { HaAlarmTile } from "@dashhaus/orb";
import { HaAlarmModule } from "@dashhaus/field";

export function OrbAlarm() {
  return <HaAlarmTile entityId="alarm_control_panel.house" exitDelay={30} entryDelay={30} />;
}

/** A panel Home Assistant can read but not control: the state and today, with nothing to arm. */
export function FieldAlarm() {
  return <HaAlarmModule entityId="alarm_control_panel.ring" readOnly />;
}

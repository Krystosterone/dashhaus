import { useHaAlarm } from "@dashhaus/core";
import type { HaAlarmOptions } from "@dashhaus/core";
import type { AlarmHandlers } from "@dashhaus/core";
import { AlarmTile } from "../cards/alarm/AlarmTile";
import type { AlarmTileProps } from "../cards/alarm/AlarmTile";

export interface HaAlarmTileProps extends HaAlarmOptions, Omit<AlarmTileProps, "entity" | "history" | keyof AlarmHandlers> {
  entityId: string;
}

/** A live alarm tile: the useHaAlarm hook above the presentational tile. */
export function HaAlarmTile({ entityId, name, area, lastSeen, exitDelay, entryDelay, openSensors, triggeredBy, history, loadHistory, onActionError, ...props }: HaAlarmTileProps) {
  const alarm = useHaAlarm(entityId, { name, area, lastSeen, exitDelay, entryDelay, openSensors, triggeredBy, history, loadHistory, onActionError });
  return <AlarmTile {...props} entity={alarm.entity} history={alarm.history} {...alarm.actions} />;
}

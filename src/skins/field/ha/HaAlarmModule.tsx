import { useHaAlarm } from "@scope/core";
import type { HaAlarmOptions } from "@scope/core";
import { AlarmModule } from "../cards/alarm/AlarmModule";
import type { AlarmModuleProps } from "../cards/alarm/AlarmModule";

export interface HaAlarmModuleProps extends HaAlarmOptions, Pick<AlarmModuleProps, "footprint" | "readOnly" | "defaultOpen"> {
  entityId: string;
}

/** A live alarm module: the useHaAlarm hook above field's module, with today's history and its arm and disarm actions. */
export function HaAlarmModule({ entityId, footprint, readOnly, defaultOpen, ...options }: HaAlarmModuleProps) {
  const { entity, history, actions } = useHaAlarm(entityId, options);
  return (
    <AlarmModule
      entity={entity}
      history={history}
      onArm={actions.onArm}
      onDisarm={actions.onDisarm}
      readOnly={readOnly}
      footprint={footprint}
      defaultOpen={defaultOpen}
    />
  );
}

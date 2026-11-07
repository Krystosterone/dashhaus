import { useHaVacuum } from "@dashhaus/core";
import type { HaVacuumOptions } from "@dashhaus/core";
import { VacuumModule } from "../cards/vacuum/VacuumModule";
import type { VacuumModuleProps } from "../cards/vacuum/VacuumModule";

export interface HaVacuumModuleProps extends HaVacuumOptions, Pick<VacuumModuleProps, "footprint" | "defaultOpen"> {
  entityId: string;
}

/** A live vacuum module: the useHaVacuum hook above field's module. */
export function HaVacuumModule({ entityId, footprint, defaultOpen, ...options }: HaVacuumModuleProps) {
  const { entity, history, actions } = useHaVacuum(entityId, options);
  return (
    <VacuumModule
      entity={entity}
      history={history}
      onStart={actions.onStart} onPause={actions.onPause} onReturnToBase={actions.onReturnToBase} onLocate={actions.onLocate} onFanSpeedChange={actions.onFanSpeedChange}
      footprint={footprint}
      defaultOpen={defaultOpen}
    />
  );
}

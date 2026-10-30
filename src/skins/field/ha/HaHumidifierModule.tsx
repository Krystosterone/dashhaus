import { useHaHumidifier } from "@dashhaus/core";
import type { HaHumidifierOptions } from "@dashhaus/core";
import { HumidifierModule } from "../cards/humidifier/HumidifierModule";
import type { HumidifierModuleProps } from "../cards/humidifier/HumidifierModule";

export interface HaHumidifierModuleProps extends HaHumidifierOptions, Pick<HumidifierModuleProps, "footprint" | "defaultOpen"> {
  entityId: string;
}

/** A live humidifier module: the useHaHumidifier hook above field's module, with today's history, target and modes. */
export function HaHumidifierModule({ entityId, footprint, defaultOpen, ...options }: HaHumidifierModuleProps) {
  const { entity, history, actions } = useHaHumidifier(entityId, options);
  return (
    <HumidifierModule
      entity={entity}
      history={history}
      onToggle={actions.onToggle}
      onTargetChange={actions.onTargetChange}
      onModeChange={actions.onModeChange}
      footprint={footprint}
      defaultOpen={defaultOpen}
    />
  );
}

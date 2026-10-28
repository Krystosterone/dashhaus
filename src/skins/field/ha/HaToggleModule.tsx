import { useHaToggle } from "../../../ha/hooks/toggle";
import type { HaToggleOptions } from "../../../ha/hooks/toggle";
import { ToggleModule } from "../cards/toggle/ToggleModule";
import type { ToggleModuleProps } from "../cards/toggle/ToggleModule";

/**
 * Home Assistant has no timed-on service for an input_boolean or switch, so `onTurnOnFor` stays the host's, as on
 * orb's tile: pass it with `durations` to give the panel its duration keys.
 */
export interface HaToggleModuleProps extends HaToggleOptions, Pick<ToggleModuleProps, "footprint" | "defaultOpen" | "onTurnOnFor" | "durations"> {
  entityId: string;
}

/** A live toggle module: the useHaToggle hook above field's module, today's history for its panel. */
export function HaToggleModule({ entityId, footprint, defaultOpen, onTurnOnFor, durations, ...options }: HaToggleModuleProps) {
  const { entity, history, actions } = useHaToggle(entityId, options);
  return <ToggleModule entity={entity} history={history} footprint={footprint} defaultOpen={defaultOpen} onTurnOnFor={onTurnOnFor} durations={durations} {...actions} />;
}

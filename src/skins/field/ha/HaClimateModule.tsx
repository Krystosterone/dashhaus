import { useHaClimate } from "../../../ha/hooks/climate";
import type { HaClimateOptions } from "../../../ha/hooks/climate";
import { ClimateModule } from "../widgets/climate/ClimateModule";
import type { ClimateModuleProps } from "../widgets/climate/ClimateModule";

export interface HaClimateModuleProps extends HaClimateOptions, Pick<ClimateModuleProps, "footprint" | "defaultOpen"> {
  entityId: string;
}

/** A live climate module: the shared HA hook over Field's module, with today's activity for its detail panel. */
export function HaClimateModule({ entityId, footprint, defaultOpen, ...options }: HaClimateModuleProps) {
  const { entity, history, actions } = useHaClimate(entityId, options);
  return <ClimateModule entity={entity} history={history} footprint={footprint} defaultOpen={defaultOpen} {...actions} />;
}

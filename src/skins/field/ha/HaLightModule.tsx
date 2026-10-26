import { useHaLight } from "../../../ha/hooks/light";
import type { HaLightOptions } from "../../../ha/hooks/light";
import { LightModule } from "../widgets/light/LightModule";
import type { LightModuleProps } from "../widgets/light/LightModule";

export interface HaLightModuleProps extends HaLightOptions, Pick<LightModuleProps, "footprint" | "defaultOpen"> {
  entityId: string;
}

/** A live light module: the useHaLight hook above the field skin's module, today's history for its panel. */
export function HaLightModule({ entityId, footprint, defaultOpen, ...options }: HaLightModuleProps) {
  const { entity, history, actions } = useHaLight(entityId, options);
  return <LightModule entity={entity} history={history} footprint={footprint} defaultOpen={defaultOpen} {...actions} />;
}

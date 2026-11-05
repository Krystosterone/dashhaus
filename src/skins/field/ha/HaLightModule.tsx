import { useHaLight } from "@dashhaus/core";
import type { HaLightOptions } from "@dashhaus/core";
import { LightModule } from "../cards/light/LightModule";
import type { LightModuleProps } from "../cards/light/LightModule";

export interface HaLightModuleProps extends HaLightOptions, Pick<LightModuleProps, "footprint" | "defaultOpen"> {
  /** The Home Assistant entity id. */
  entityId: string;
}

/** A live light module: the useHaLight hook above the field skin's module, today's history for its panel. */
export function HaLightModule({ entityId, footprint, defaultOpen, ...options }: HaLightModuleProps) {
  const { entity, history, actions } = useHaLight(entityId, options);
  return <LightModule entity={entity} history={history} footprint={footprint} defaultOpen={defaultOpen} {...actions} />;
}

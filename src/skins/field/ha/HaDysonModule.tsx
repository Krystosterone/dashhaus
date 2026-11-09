import { useHaDyson } from "@dashhaus/core";
import type { HaDysonOptions } from "@dashhaus/core";
import { DysonModule } from "../cards/dyson/DysonModule";
import type { DysonModuleProps } from "../cards/dyson/DysonModule";

export interface HaDysonModuleProps extends HaDysonOptions, Pick<DysonModuleProps, "footprint" | "defaultOpen"> {
  entityId: string;
}

/** A live Dyson module: the useHaDyson hook, its fan and the companions on its device, above field's module. */
export function HaDysonModule({ entityId, footprint, defaultOpen, ...options }: HaDysonModuleProps) {
  const { entity, history, actions } = useHaDyson(entityId, options);
  return <DysonModule entity={entity} history={history} {...actions} footprint={footprint} defaultOpen={defaultOpen} />;
}

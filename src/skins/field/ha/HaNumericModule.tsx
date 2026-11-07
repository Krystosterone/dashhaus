import { useHaNumeric } from "@dashhaus/core";
import type { HaNumericOptions } from "@dashhaus/core";
import { NumericModule } from "../cards/numeric/NumericModule";
import type { NumericModuleProps } from "../cards/numeric/NumericModule";

export interface HaNumericModuleProps extends HaNumericOptions, Pick<NumericModuleProps, "footprint" | "defaultOpen"> {
  entityId: string;
}

/** A live numeric module: the useHaNumeric hook above field's module. */
export function HaNumericModule({ entityId, footprint, defaultOpen, ...options }: HaNumericModuleProps) {
  const { entity, history } = useHaNumeric(entityId, options);
  return (
    <NumericModule
      entity={entity}
      history={history}
      footprint={footprint}
      defaultOpen={defaultOpen}
    />
  );
}

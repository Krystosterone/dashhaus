import { useHaSun } from "@dashhaus/core";
import type { HaSunOptions } from "@dashhaus/core";
import { SunModule } from "../cards/sun/SunModule";
import type { SunModuleProps } from "../cards/sun/SunModule";

export interface HaSunModuleProps extends HaSunOptions, Pick<SunModuleProps, "footprint" | "defaultOpen"> {
  entityId: string;
}

/** A live sun module: the useHaSun hook above field's module. */
export function HaSunModule({ entityId, footprint, defaultOpen, ...options }: HaSunModuleProps) {
  const { entity, history } = useHaSun(entityId, options);
  return (
    <SunModule
      entity={entity}
      history={history}
      footprint={footprint}
      defaultOpen={defaultOpen}
    />
  );
}

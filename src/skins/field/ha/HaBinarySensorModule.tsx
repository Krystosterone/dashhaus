import { useHaBinarySensor } from "@dashhaus/core";
import type { HaBinarySensorOptions } from "@dashhaus/core";
import { BinarySensorModule } from "../cards/binarySensor/BinarySensorModule";
import type { BinarySensorModuleProps } from "../cards/binarySensor/BinarySensorModule";

export interface HaBinarySensorModuleProps extends HaBinarySensorOptions, Pick<BinarySensorModuleProps, "footprint" | "defaultOpen"> {
  /** The Home Assistant entity id. */
  entityId: string;
}

/** A live binary sensor module: the useHaBinarySensor hook, with its device's battery, above field's module. It sends no services. */
export function HaBinarySensorModule({ entityId, footprint, defaultOpen, ...options }: HaBinarySensorModuleProps) {
  const { entity, history } = useHaBinarySensor(entityId, options);
  return (
    <BinarySensorModule
      entity={entity}
      history={history}
      footprint={footprint}
      defaultOpen={defaultOpen}
    />
  );
}

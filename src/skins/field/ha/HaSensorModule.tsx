import { useHaSensor } from "@scope/core";
import type { HaSensorOptions } from "@scope/core";
import { SensorModule } from "../cards/sensor/SensorModule";
import type { SensorModuleProps } from "../cards/sensor/SensorModule";

export interface HaSensorModuleProps extends HaSensorOptions, Pick<SensorModuleProps, "footprint" | "defaultOpen"> {
  /** Primary sensor, normally the temperature entity for this device. */
  entityId: string;
}

/** A live, read-only sensor module: the useHaSensor hook, with its humidity and battery companions, above field's module. */
export function HaSensorModule({ entityId, footprint, defaultOpen, ...options }: HaSensorModuleProps) {
  const { entity, history } = useHaSensor(entityId, options);
  return <SensorModule entity={entity} history={history} footprint={footprint} defaultOpen={defaultOpen} />;
}

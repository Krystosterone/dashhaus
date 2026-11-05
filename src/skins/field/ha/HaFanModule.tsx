import { useHaFan } from "@dashhaus/core";
import type { HaFanOptions } from "@dashhaus/core";
import { FanModule } from "../cards/fan/FanModule";
import type { FanModuleProps } from "../cards/fan/FanModule";

export interface HaFanModuleProps extends HaFanOptions, Pick<FanModuleProps, "footprint" | "defaultOpen"> {
  /** The Home Assistant entity id. */
  entityId: string;
}

/** A live fan module: the useHaFan hook above field's module, with today's history and its five services. */
export function HaFanModule({ entityId, footprint, defaultOpen, ...options }: HaFanModuleProps) {
  const { entity, history, actions } = useHaFan(entityId, options);
  return (
    <FanModule
      entity={entity}
      history={history}
      onToggle={actions.onToggle}
      onPercentageChange={actions.onPercentageChange}
      onPresetChange={actions.onPresetChange}
      onOscillateChange={actions.onOscillateChange}
      onDirectionChange={actions.onDirectionChange}
      footprint={footprint}
      defaultOpen={defaultOpen}
    />
  );
}

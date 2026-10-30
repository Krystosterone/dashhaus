import { useHaOwlet } from "@dashhaus/core";
import type { HaOwletOptions } from "@dashhaus/core";
import { OwletModule } from "../cards/owlet/OwletModule";
import type { OwletModuleProps } from "../cards/owlet/OwletModule";

export interface HaOwletModuleProps extends HaOwletOptions, Pick<OwletModuleProps, "footprint" | "defaultOpen"> {
  /** The sock's sleep state sensor, `sensor.*_sleep_state`; its readings, alerts and base station are found beside it. */
  entityId: string;
}

/**
 * A live Owlet sock module: the useHaOwlet hook, with its readings, charging and alert sensors and its base station's
 * switch, above field's module, with today's history. The base station switches from the panel only.
 */
export function HaOwletModule({ entityId, footprint, defaultOpen, ...options }: HaOwletModuleProps) {
  const { entity, history, actions } = useHaOwlet(entityId, options);
  return (
    <OwletModule
      entity={entity}
      history={history}
      onBaseToggle={actions.onBaseToggle}
      footprint={footprint}
      defaultOpen={defaultOpen}
    />
  );
}

import { useHaSound } from "@dashhaus/core";
import type { HaSoundOptions } from "@dashhaus/core";
import { SoundModule } from "../cards/sound/SoundModule";
import type { SoundModuleProps } from "../cards/sound/SoundModule";

export interface HaSoundModuleProps extends HaSoundOptions, Pick<SoundModuleProps, "footprint" | "defaultOpen"> {
  /** The sound's `switch.*` (the Tuya integration's `switch.<device>_music`). */
  entityId: string;
}

/** A live sound module: the useHaSound hook above field's module, its volume found beside the switch, with today's history. */
export function HaSoundModule({ entityId, footprint, defaultOpen, ...options }: HaSoundModuleProps) {
  const { entity, history, actions } = useHaSound(entityId, options);
  return (
    <SoundModule
      entity={entity}
      history={history}
      onToggle={actions.onToggle}
      onVolumeChange={actions.onVolumeChange}
      footprint={footprint}
      defaultOpen={defaultOpen}
    />
  );
}

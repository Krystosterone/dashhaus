import { useHaSound } from "../../../ha/hooks/sound";
import type { HaSoundOptions } from "../../../ha/hooks/sound";
import type { SoundHandlers } from "../../../ha/actions/sound";
import { SoundTile } from "../cards/sound/SoundTile";
import type { SoundTileProps } from "../cards/sound/SoundTile";

export interface HaSoundTileProps extends HaSoundOptions, Omit<SoundTileProps, "entity" | "history" | keyof SoundHandlers> {
  /** The sound's `switch.*` (the Tuya integration's `switch.<device>_music`). */
  entityId: string;
}

/** A live sound tile: the useHaSound hook above the presentational tile. */
export function HaSoundTile({ entityId, volumeEntityId, name, area, lastSeen, history, loadHistory, onActionError, ...props }: HaSoundTileProps) {
  const sound = useHaSound(entityId, { volumeEntityId, name, area, lastSeen, history, loadHistory, onActionError });
  return <SoundTile {...props} entity={sound.entity} history={sound.history} {...sound.actions} />;
}

import { useMemo } from "react";
import { useHaEntities, useHaEntity, useHaStore } from "./provider";
import { createSoundHandlers } from "./actions/sound";
import { soundFromHass, soundVolumeCandidates, soundVolumeFromHass } from "./mappers/sound";
import { onOffHistoryFromHass } from "./history";
import { useHaArea } from "./registry";
import { useHaHistory } from "./useHaHistory";
import { useNow } from "../shared/useNow";
import { SoundTile } from "../widgets/sound/SoundTile";
import type { SoundTileProps } from "../widgets/sound/SoundTile";
import type { SoundHistory } from "../widgets/sound/types";
import type { HaActionError } from "./types";

export interface HaSoundTileProps extends Omit<SoundTileProps, "entity" | "onToggle" | "onVolumeChange"> {
  /** The sound's `switch.*` (the Tuya integration's `switch.<device>_music`). */
  entityId: string;
  /** The volume `number.*`. Default: `number.<device>_music_volume` or `number.<device>_volume` beside `entityId`. */
  volumeEntityId?: string;
  name?: string;
  /** Overrides the area Home Assistant's registries resolve. */
  area?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: SoundHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

/** A live sound tile: the switch and its volume are selected and mapped above the presentational tile. */
export function HaSoundTile({ entityId, volumeEntityId, name, area, lastSeen, history, loadHistory = true, onActionError, ...props }: HaSoundTileProps) {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const candidates = useHaEntities(volumeEntityId ? [volumeEntityId] : soundVolumeCandidates(entityId));
  const volumeEntity = candidates.find((candidate) => candidate != null);
  const volume = useMemo(() => soundVolumeFromHass(volumeEntity), [volumeEntity]);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => onOffHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => soundFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now, volumeEntity }), [raw, entityId, name, area, registryArea, lastSeen, now, volumeEntity]);
  const handlers = useMemo(() => createSoundHandlers(store, entity, { onError: onActionError, volume }), [store, entity, onActionError, volume]);
  return <SoundTile {...props} entity={entity} history={history ?? parsedHistory} {...handlers} />;
}

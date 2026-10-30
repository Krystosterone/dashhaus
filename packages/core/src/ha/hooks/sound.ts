import { useMemo } from "react";
import { useHaEntities, useHaEntity, useHaStore } from "../provider";
import { createSoundHandlers } from "../actions/sound";
import type { SoundHandlers } from "../actions/sound";
import { soundFromHass, soundVolumeCandidates, soundVolumeFromHass } from "../mappers/sound";
import { onOffHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { useNow } from "../../hooks/useNow";
import type { SoundEntity, SoundHistory } from "../../entities/sound/types";
import type { HaActionError } from "../types";

export interface HaSoundOptions {
  /** The volume `number.*`. Default: `number.<device>_music_volume` or `number.<device>_volume` beside the switch. */
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

export interface HaSoundResult {
  entity: SoundEntity;
  history: SoundHistory;
  actions: SoundHandlers;
}

/** One live sound machine for any UI: the switch and its volume mapped together, today's history and its actions. */
export function useHaSound(entityId: string, { volumeEntityId, name, area, lastSeen, history, loadHistory = true, onActionError }: HaSoundOptions = {}): HaSoundResult {
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
  const actions = useMemo(() => createSoundHandlers(store, entity, { onError: onActionError, volume }), [store, entity, onActionError, volume]);
  return { entity, history: history ?? parsedHistory, actions };
}

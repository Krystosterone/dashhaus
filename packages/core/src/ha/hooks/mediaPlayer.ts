import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createMediaPlayerHandlers } from "../actions/mediaPlayer";
import type { MediaPlayerHandlers } from "../actions/mediaPlayer";
import { mediaPlayerFromHass } from "../mappers/mediaPlayer";
import { mediaPlayerHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { useHaPicture } from "../useHaPicture";
import { useNow } from "../../hooks/useNow";
import { useHourCycle } from "../../hooks/hourCycle";
import type { MediaPlayerEntity, MediaPlayerHistory } from "../../entities/mediaPlayer/types";
import type { HaActionError } from "../types";

export interface HaMediaPlayerOptions {
  name?: string;
  /** Overrides the area Home Assistant's registries resolve. */
  area?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: MediaPlayerHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

export interface HaMediaPlayerResult {
  entity: MediaPlayerEntity;
  history?: MediaPlayerHistory;
  actions: MediaPlayerHandlers;
}

/**
 * One live media player for any UI: the mapped entity with its artwork (its own `entity_picture`, resolved by the
 * connection, while it is available and something is loaded), today's playing, and its service actions.
 */
export function useHaMediaPlayer(entityId: string, { name, area, lastSeen, history, loadHistory = true, onActionError }: HaMediaPlayerOptions = {}): HaMediaPlayerResult {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const picture = useHaPicture(entityId);
  const now = useNow();
  const hourCycle = useHourCycle();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => mediaPlayerHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const mapped = useMemo(() => mediaPlayerFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now, hourCycle }), [raw, entityId, name, area, registryArea, lastSeen, now, hourCycle]);
  // Artwork belongs to what is loaded: none while off or asleep, whatever the attribute still says.
  const entity = useMemo(() => (picture && mapped.state !== "off" && mapped.state !== "standby" ? { ...mapped, picture } : mapped), [mapped, picture]);
  const actions = useMemo(() => createMediaPlayerHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return { entity, history: history ?? (loadHistory ? parsedHistory : undefined), actions };
}

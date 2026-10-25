import { useMemo } from "react";
import { useHaEntity, useHaStore } from "./provider";
import { createLightHandlers } from "./actions/light";
import { lightFromHass } from "./mappers/light";
import { lightHistoryFromHass } from "./history";
import { useHaArea } from "./registry";
import { useHaHistory } from "./useHaHistory";
import { useNow } from "../shared/useNow";
import { LightTile } from "../widgets/light/LightTile";
import type { LightTileProps } from "../widgets/light/LightTile";
import type { LightHistory } from "../widgets/light/types";
import type { HaActionError } from "./types";

export interface HaLightTileProps extends Omit<LightTileProps, "entity" | "onToggle" | "onBrightnessChange" | "onKelvinChange" | "onColorChange"> {
  entityId: string;
  name?: string;
  area?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: LightHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

/** A live light tile: raw state is selected and mapped above the existing presentational tile. */
export function HaLightTile({ entityId, name, area, lastSeen, history, loadHistory = true, onActionError, ...props }: HaLightTileProps) {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => lightHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => lightFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now }), [raw, entityId, area, registryArea, name, lastSeen, now]);
  const handlers = useMemo(() => createLightHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return <LightTile {...props} entity={entity} history={history ?? parsedHistory} {...handlers} />;
}

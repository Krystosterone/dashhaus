import { useMemo } from "react";
import { useHaEntity, useHaStore } from "./provider";
import { createHumidifierHandlers } from "./actions/humidifier";
import { humidifierFromHass } from "./mappers/humidifier";
import { onOffHistoryFromHass } from "./history";
import { useHaArea } from "./registry";
import { useHaHistory } from "./useHaHistory";
import { useNow } from "../shared/useNow";
import { HumidifierTile } from "../widgets/humidifier/HumidifierTile";
import type { HumidifierTileProps } from "../widgets/humidifier/HumidifierTile";
import type { HumidifierHistory } from "../widgets/humidifier/types";
import type { HaActionError } from "./types";

export interface HaHumidifierTileProps extends Omit<HumidifierTileProps, "entity" | "onToggle" | "onTargetChange" | "onModeChange"> {
  entityId: string;
  name?: string;
  /** Overrides the area Home Assistant's registries resolve. */
  area?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: HumidifierHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

/** A live humidifier tile: raw state is selected and mapped above the presentational tile. */
export function HaHumidifierTile({ entityId, name, area, lastSeen, history, loadHistory = true, onActionError, ...props }: HaHumidifierTileProps) {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => onOffHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => humidifierFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now }), [raw, entityId, name, area, registryArea, lastSeen, now]);
  const handlers = useMemo(() => createHumidifierHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return <HumidifierTile {...props} entity={entity} history={history ?? parsedHistory} {...handlers} />;
}

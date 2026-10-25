import { useMemo } from "react";
import { useHaEntity, useHaStore } from "./provider";
import { createClimateHandlers } from "./actions/climate";
import { climateFromHass } from "./mappers/climate";
import { climateHistoryFromHass } from "./history";
import { useHaArea } from "./registry";
import { useHaHistory } from "./useHaHistory";
import { useNow } from "../shared/useNow";
import { ClimateTile } from "../widgets/climate/ClimateTile";
import type { ClimateTileProps } from "../widgets/climate/ClimateTile";
import type { ClimateHistory } from "../domains/climate/types";
import type { HaActionError } from "./types";

export interface HaClimateTileProps extends Omit<ClimateTileProps, "entity" | "onToggle" | "onTargetChange" | "onRangeChange" | "onModeChange" | "onPresetChange" | "onFanChange"> {
  entityId: string;
  name?: string;
  area?: string;
  lastSeen?: string;
  unit?: "°C" | "°F";
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: ClimateHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

/** A live climate tile: raw state is selected and mapped above the existing presentational tile. */
export function HaClimateTile({ entityId, name, area, lastSeen, unit, history, loadHistory = true, onActionError, ...props }: HaClimateTileProps) {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => climateHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => climateFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, unit, now }), [raw, entityId, area, registryArea, name, lastSeen, unit, now]);
  const handlers = useMemo(() => createClimateHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return <ClimateTile {...props} entity={entity} history={history ?? parsedHistory} {...handlers} />;
}

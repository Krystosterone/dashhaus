import { useMemo } from "react";
import { useHaEntity } from "../provider";
import { numericFromHass } from "../mappers/numeric";
import { readingHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { useNow } from "../../hooks/useNow";
import { useHourCycle } from "../../hooks/hourCycle";
import type { NumericEntity, NumericHistory } from "../../entities/numeric/types";

export interface HaNumericOptions {
  name?: string;
  /** Overrides the area Home Assistant's registries resolve. */
  area?: string;
  /** Use when the raw entity omits its unit. */
  unit?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: NumericHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
}

export interface HaNumericResult {
  entity: NumericEntity;
  history: NumericHistory;
}

/** One live, read-only numeric reading (CO₂, power, energy) for any UI: the mapped entity and today's history. It sends no services. */
export function useHaNumeric(entityId: string, { name, area, unit, lastSeen, history, loadHistory = true }: HaNumericOptions = {}): HaNumericResult {
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const hourCycle = useHourCycle();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => readingHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => numericFromHass(raw, entityId, { name, area: area ?? registryArea, unit, lastSeen, now, hourCycle }), [raw, entityId, name, area, registryArea, unit, lastSeen, now, hourCycle]);
  return { entity, history: history ?? parsedHistory };
}

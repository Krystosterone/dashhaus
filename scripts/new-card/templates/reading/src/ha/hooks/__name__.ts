import { useMemo } from "react";
import { useHaEntity } from "../provider";
import { __name__FromHass } from "../mappers/__name__";
import { readingHistoryFromHass } from "../history";
import { useHaArea } from "../registry";
import { useHaHistory } from "../useHaHistory";
import { useNow } from "../../hooks/useNow";
import type { __Name__Entity, __Name__History } from "../../domains/__name__/types";

export interface Ha__Name__Options {
  name?: string;
  /** Overrides the area Home Assistant's registries resolve. */
  area?: string;
  /** Use when the raw entity omits its unit. */
  unit?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: __Name__History;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
}

export interface Ha__Name__Result {
  entity: __Name__Entity;
  history: __Name__History;
}

/** One live, read-only __label__ for any UI: the mapped entity and today's history. It sends no services. */
export function useHa__Name__(entityId: string, { name, area, unit, lastSeen, history, loadHistory = true }: Ha__Name__Options = {}): Ha__Name__Result {
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => readingHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => __name__FromHass(raw, entityId, { name, area: area ?? registryArea, unit, lastSeen, now }), [raw, entityId, name, area, registryArea, unit, lastSeen, now]);
  return { entity, history: history ?? parsedHistory };
}

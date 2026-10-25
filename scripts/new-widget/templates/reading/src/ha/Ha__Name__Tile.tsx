import { useMemo } from "react";
import { useHaEntity } from "./provider";
import { __name__FromHass } from "./mappers/__name__";
import { readingHistoryFromHass } from "./history";
import { useHaArea } from "./registry";
import { useHaHistory } from "./useHaHistory";
import { useNow } from "../shared/useNow";
import { __Name__Tile } from "../widgets/__name__/__Name__Tile";
import type { __Name__TileProps } from "../widgets/__name__/__Name__Tile";
import type { __Name__History } from "../domains/__name__/types";

export interface Ha__Name__TileProps extends Omit<__Name__TileProps, "entity"> {
  entityId: string;
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

/** A live, read-only __label__ tile: raw state is selected and mapped above the presentational tile. It sends no services. */
export function Ha__Name__Tile({ entityId, name, area, unit, lastSeen, history, loadHistory = true, ...props }: Ha__Name__TileProps) {
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => readingHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => __name__FromHass(raw, entityId, { name, area: area ?? registryArea, unit, lastSeen, now }), [raw, entityId, name, area, registryArea, unit, lastSeen, now]);
  return <__Name__Tile {...props} entity={entity} history={history ?? parsedHistory} />;
}

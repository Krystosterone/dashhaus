import { useMemo } from "react";
import { useHaEntity, useHaStore } from "./provider";
import { createCoverHandlers } from "./actions/cover";
import { coverFromHass } from "./mappers/cover";
import { coverHistoryFromHass } from "./history";
import { useHaArea } from "./registry";
import { useHaHistory } from "./useHaHistory";
import { useNow } from "../shared/useNow";
import { CoverTile } from "../widgets/cover/CoverTile";
import type { CoverTileProps } from "../widgets/cover/CoverTile";
import type { CoverHistory } from "../widgets/cover/types";
import type { HaActionError } from "./types";

export interface HaCoverTileProps extends Omit<CoverTileProps, "entity" | "onOpenCover" | "onCloseCover" | "onStopCover" | "onSetPosition" | "onSetTilt"> {
  entityId: string;
  name?: string;
  area?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: CoverHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

/** A live cover tile: raw state is selected and mapped above the existing presentational tile. */
export function HaCoverTile({ entityId, name, area, lastSeen, history, loadHistory = true, onActionError, ...props }: HaCoverTileProps) {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => coverHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => coverFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now }), [raw, entityId, area, registryArea, name, lastSeen, now]);
  const handlers = useMemo(() => createCoverHandlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return <CoverTile {...props} entity={entity} history={history ?? parsedHistory} {...handlers} />;
}

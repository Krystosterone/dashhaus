import { useMemo } from "react";
import { useHaEntity, useHaStore } from "./provider";
import { create__Name__Handlers } from "./actions/__name__";
import { __name__FromHass } from "./mappers/__name__";
import { onOffHistoryFromHass } from "./history";
import { useHaArea } from "./registry";
import { useHaHistory } from "./useHaHistory";
import { useNow } from "../shared/useNow";
import { __Name__Tile } from "../widgets/__name__/__Name__Tile";
import type { __Name__TileProps } from "../widgets/__name__/__Name__Tile";
import type { __Name__History } from "../widgets/__name__/types";
import type { HaActionError } from "./types";

export interface Ha__Name__TileProps extends Omit<__Name__TileProps, "entity" | "onToggle"> {
  entityId: string;
  name?: string;
  /** Overrides the area Home Assistant's registries resolve. */
  area?: string;
  lastSeen?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: __Name__History;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

/** A live __label__ tile: raw state is selected and mapped above the presentational tile. */
export function Ha__Name__Tile({ entityId, name, area, lastSeen, history, loadHistory = true, onActionError, ...props }: Ha__Name__TileProps) {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => onOffHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => __name__FromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now }), [raw, entityId, name, area, registryArea, lastSeen, now]);
  const handlers = useMemo(() => create__Name__Handlers(store, entity, { onError: onActionError }), [store, entity, onActionError]);
  return <__Name__Tile {...props} entity={entity} history={history ?? parsedHistory} {...handlers} />;
}

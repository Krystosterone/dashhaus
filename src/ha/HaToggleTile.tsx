import { useMemo } from "react";
import { useHaEntity, useHaStore } from "./provider";
import { createToggleHandlers } from "./actions/toggle";
import type { ToggleDomain } from "./actions/toggle";
import { toggleFromHass } from "./mappers/toggle";
import { toggleHistoryFromHass } from "./history";
import { useHaArea } from "./registry";
import { useHaHistory } from "./useHaHistory";
import { useNow } from "../shared/useNow";
import { ToggleTile } from "../widgets/toggle/ToggleTile";
import type { ToggleTileProps } from "../widgets/toggle/ToggleTile";
import type { ToggleIcon, ToggleHistory } from "../domains/toggle/types";
import type { ColorName } from "../shared/ui";
import type { HaActionError } from "./types";

export interface HaToggleTileProps extends Omit<ToggleTileProps, "entity" | "onToggle"> {
  entityId: string;
  /** Required: the native domain ("input_boolean" | "switch"). */
  domain: ToggleDomain;
  name?: string;
  area?: string;
  lastSeen?: string;
  icon?: ToggleIcon;
  color?: ColorName;
  description?: string;
  /** Host-owned history override; when omitted, today's history is read from Home Assistant. */
  history?: ToggleHistory;
  /** Set false to skip the Home Assistant history read. */
  loadHistory?: boolean;
  onActionError?: (error: HaActionError) => void;
}

/** A live toggle tile: raw state is selected and mapped above the existing presentational tile. */
export function HaToggleTile({ entityId, domain, name, area, lastSeen, icon, color, description, history, loadHistory = true, onActionError, ...props }: HaToggleTileProps) {
  const store = useHaStore();
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const records = useHaHistory([entityId], loadHistory && history === undefined, now);
  const parsedHistory = useMemo(() => toggleHistoryFromHass(records, entityId, now), [records, entityId, now]);
  const entity = useMemo(() => toggleFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, icon, color, description, now }), [raw, entityId, area, registryArea, name, lastSeen, icon, color, description, now]);
  const handlers = useMemo(() => createToggleHandlers(store, entity, { domain, onError: onActionError }), [store, entity, domain, onActionError]);
  return <ToggleTile {...props} entity={entity} history={history ?? parsedHistory} {...handlers} />;
}

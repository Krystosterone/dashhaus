import { useHaCover } from "./hooks/cover";
import type { HaCoverOptions } from "./hooks/cover";
import type { CoverHandlers } from "./actions/cover";
import { CoverTile } from "../widgets/cover/CoverTile";
import type { CoverTileProps } from "../widgets/cover/CoverTile";

export interface HaCoverTileProps extends HaCoverOptions, Omit<CoverTileProps, "entity" | "history" | keyof CoverHandlers> {
  entityId: string;
}

/** A live cover tile: the useHaCover hook above the presentational tile. */
export function HaCoverTile({ entityId, name, area, lastSeen, history, loadHistory, onActionError, ...props }: HaCoverTileProps) {
  const cover = useHaCover(entityId, { name, area, lastSeen, history, loadHistory, onActionError });
  return <CoverTile {...props} entity={cover.entity} history={cover.history} {...cover.actions} />;
}

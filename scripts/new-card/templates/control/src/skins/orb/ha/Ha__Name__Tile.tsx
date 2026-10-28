import { useHa__Name__ } from "../../../ha/hooks/__name__";
import type { Ha__Name__Options } from "../../../ha/hooks/__name__";
import type { __Name__Handlers } from "../../../ha/actions/__name__";
import { __Name__Tile } from "../cards/__name__/__Name__Tile";
import type { __Name__TileProps } from "../cards/__name__/__Name__Tile";

export interface Ha__Name__TileProps extends Ha__Name__Options, Omit<__Name__TileProps, "entity" | "history" | keyof __Name__Handlers> {
  entityId: string;
}

/** A live __label__ tile: the useHa__Name__ hook above the presentational tile. */
export function Ha__Name__Tile({ entityId, name, area, lastSeen, history, loadHistory, onActionError, ...props }: Ha__Name__TileProps) {
  const live = useHa__Name__(entityId, { name, area, lastSeen, history, loadHistory, onActionError });
  return <__Name__Tile {...props} entity={live.entity} history={live.history} {...live.actions} />;
}

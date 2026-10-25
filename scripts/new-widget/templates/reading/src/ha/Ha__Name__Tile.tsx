import { useHa__Name__ } from "./hooks/__name__";
import type { Ha__Name__Options } from "./hooks/__name__";
import { __Name__Tile } from "../widgets/__name__/__Name__Tile";
import type { __Name__TileProps } from "../widgets/__name__/__Name__Tile";

export interface Ha__Name__TileProps extends Ha__Name__Options, Omit<__Name__TileProps, "entity" | "history"> {
  entityId: string;
}

/** A live, read-only __label__ tile: the useHa__Name__ hook above the presentational tile. It sends no services. */
export function Ha__Name__Tile({ entityId, name, area, unit, lastSeen, history, loadHistory, ...props }: Ha__Name__TileProps) {
  const live = useHa__Name__(entityId, { name, area, unit, lastSeen, history, loadHistory });
  return <__Name__Tile {...props} entity={live.entity} history={live.history} />;
}

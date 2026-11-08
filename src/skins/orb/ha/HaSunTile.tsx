import { useHaSun } from "@dashhaus/core";
import type { HaSunOptions } from "@dashhaus/core";
import { SunTile } from "../cards/sun/SunTile";
import type { SunTileProps } from "../cards/sun/SunTile";

export interface HaSunTileProps extends HaSunOptions, Omit<SunTileProps, "entity" | "history"> {
  entityId: string;
}

/** A live, read-only sun tile: the useHaSun hook above the presentational tile. It sends no services. */
export function HaSunTile({ entityId, name, area, lastSeen, latitude, longitude, loadHistory, ...props }: HaSunTileProps) {
  const live = useHaSun(entityId, { name, area, lastSeen, latitude, longitude, loadHistory });
  return <SunTile {...props} entity={live.entity} history={live.history} />;
}

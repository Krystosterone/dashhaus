import { useHa__Name__ } from "@dashhaus/core";
import type { Ha__Name__Options } from "@dashhaus/core";
import { __Name__Tile } from "../cards/__name__/__Name__Tile";
import type { __Name__TileProps } from "../cards/__name__/__Name__Tile";

export interface Ha__Name__TileProps extends Ha__Name__Options, Pick<__Name__TileProps, "footprint" | "showControl" | "defaultOpen" | "color"> {
  entityId: string;
}

/** A live __label__ tile: the useHa__Name__ hook above the presentational tile. */
export function Ha__Name__Tile({ entityId, footprint, showControl, defaultOpen, color, ...options }: Ha__Name__TileProps) {
  const { entity__historyDestructure____actions__ } = useHa__Name__(entityId, options);
  return (
    <__Name__Tile
      entity={entity}
__historyLive__
      __liveProps__
      footprint={footprint}
      showControl={showControl}
      defaultOpen={defaultOpen}
      color={color}
    />
  );
}

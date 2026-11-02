import { useHaCover } from "@dashhaus/core";
import { MySkinCoverTile } from "../cards/cover/MySkinCoverCard";

export interface HaMySkinCoverCardProps {
  entityId: string;
  name?: string;
  area?: string;
}

/** The shared cover hook above the skin's card; it owns the service calls, never the drawing or the details state. */
export function HaMySkinCoverCard({ entityId, name, area }: HaMySkinCoverCardProps) {
  const { entity, actions } = useHaCover(entityId, { name, area });
  return (
    <MySkinCoverTile
      name={entity.name}
      area={entity.area}
      position={entity.position}
      state={entity.state}
      onOpenCover={actions.onOpenCover}
      onCloseCover={actions.onCloseCover}
    />
  );
}

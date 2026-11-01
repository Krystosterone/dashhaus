import { useHaCover } from "@dashhaus/core";
import { MySkinCoverCard } from "../cards/cover/MySkinCoverCard";

export interface HaMySkinCoverCardProps {
  entityId: string;
  name?: string;
  area?: string;
}

/** The shared cover hook above the skin's card; it owns the service calls, never the drawing. */
export function HaMySkinCoverCard({ entityId, name, area }: HaMySkinCoverCardProps) {
  const { entity, actions } = useHaCover(entityId, { name, area });
  return (
    <MySkinCoverCard
      name={entity.name}
      area={entity.area}
      position={entity.position}
      state={entity.state}
      onOpen={actions.onOpenCover}
      onClose={actions.onCloseCover}
    />
  );
}

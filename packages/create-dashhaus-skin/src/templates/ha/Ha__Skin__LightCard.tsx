import { useHaLight } from "@dashhaus/core";
import { __Skin__LightTile } from "../cards/light/__Skin__LightCard";

export interface Ha__Skin__LightCardProps {
  entityId: string;
  name?: string;
  area?: string;
}

/** The shared light hook above the skin's card; it owns the service call, never the drawing or the details state. */
export function Ha__Skin__LightCard({ entityId, name, area }: Ha__Skin__LightCardProps) {
  const { entity, actions } = useHaLight(entityId, { name, area });
  return (
    <__Skin__LightTile
      name={entity.name}
      area={entity.area}
      on={entity.state === "on"}
      unavailable={entity.state === "unavailable"}
      brightness={entity.brightness}
      onToggle={actions.onToggle}
    />
  );
}

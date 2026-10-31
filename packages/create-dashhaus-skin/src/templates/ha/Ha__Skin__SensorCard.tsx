import { useHaSensor } from "@dashhaus/core";
import { __Skin__SensorCard } from "../cards/sensor/__Skin__SensorCard";

export interface Ha__Skin__SensorCardProps {
  entityId: string;
  name?: string;
  area?: string;
}

/** The shared sensor hook above the skin's card; the reading is read-only. */
export function Ha__Skin__SensorCard({ entityId, name, area }: Ha__Skin__SensorCardProps) {
  const { entity } = useHaSensor(entityId, { name, area });
  return (
    <__Skin__SensorCard
      name={entity.name}
      area={entity.area}
      temperature={entity.temperature}
      humidity={entity.humidity}
      unit={entity.unit}
    />
  );
}

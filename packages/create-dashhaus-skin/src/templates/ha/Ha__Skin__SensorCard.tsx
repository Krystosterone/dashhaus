import { useHaSensor } from "@dashhaus/core";
import { __Skin__SensorTile } from "../cards/sensor/__Skin__SensorCard";

export interface Ha__Skin__SensorCardProps {
  entityId: string;
  /** The humidity sensor on the same device, when there is one. */
  humidity?: string;
  name?: string;
  area?: string;
}

/** The shared sensor hook above the skin's card; the reading is read-only and the frame owns its details. */
export function Ha__Skin__SensorCard({ entityId, humidity, name, area }: Ha__Skin__SensorCardProps) {
  const { entity } = useHaSensor(entityId, { humidityEntityId: humidity, name, area });
  return (
    <__Skin__SensorTile
      name={entity.name}
      area={entity.area}
      temperature={entity.temperature}
      humidity={entity.humidity}
      unit={entity.unit}
    />
  );
}

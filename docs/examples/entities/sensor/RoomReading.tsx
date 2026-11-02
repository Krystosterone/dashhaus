import { useHaSensor } from "@dashhaus/core";
import { fmt1 } from "@dashhaus/core/entities";

/** A room's temperature, with the humidity and battery sensors on the same device. */
export function RoomReading() {
  const { entity } = useHaSensor("sensor.bedroom_temperature", {
    humidityEntityId: "sensor.bedroom_humidity",
    batteryEntityId: "sensor.bedroom_battery",
  });
  if (entity.state === "unavailable") return <p>{entity.name}: no reading</p>;
  return (
    <p>
      {entity.name}: {entity.temperature == null ? "—" : `${fmt1(entity.temperature)}${entity.unit}`}
      {entity.humidity != null && `, ${fmt1(entity.humidity)}% humidity`}
      {entity.battery != null && entity.battery < 20 && " (battery low)"}
    </p>
  );
}

import { useHaDyson } from "@dashhaus/core";

/** A device renamed in Home Assistant, so its companions aren't named after its fan: name them, or leave one out. */
export function Renamed() {
  const { entity } = useHaDyson("fan.bedroom", {
    companions: { pm25: "sensor.bedroom_air_pm25", heat: "climate.bedroom_heater", nightMode: "" },
  });
  return <p>{entity.name}: {entity.air.length} readings, {entity.supportsHeat ? "heats" : "doesn't heat"}</p>;
}

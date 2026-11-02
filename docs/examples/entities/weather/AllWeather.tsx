import { HaWeather, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";

const weatherIds = (snapshot: HaSnapshot) =>
  Object.keys(snapshot.entities).filter((id) => id.startsWith("weather.")).sort().join(" ");

/** Every weather entity, conditions only: each one's forecast is a read of its own, so leave it out of a list. */
export function AllWeather() {
  const ids = useHaSelector(weatherIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <HaWeather entityId={id} loadForecasts={false} loadHistory={false}>
            {({ entity }) => (
              <>
                {entity.name}: {entity.state}, {entity.temperature ?? "—"}
                {entity.temperatureUnit}
              </>
            )}
          </HaWeather>
        </li>
      ))}
    </ul>
  );
}

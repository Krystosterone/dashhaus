import { useHaSun } from "@dashhaus/core";
import { useHourCycle } from "@dashhaus/core/hooks";
import { sunAllDay, sunNext, sunTime, sunWhen } from "@dashhaus/core/entities/sun/words";

/** When the sun next sets or rises, on the page's clock, and how long until it. */
export function NextSunEvent() {
  const { entity } = useHaSun("sun.sun");
  const hourCycle = useHourCycle();
  if (entity.state === "unavailable") return <p>{entity.name} is unavailable</p>;
  const next = sunNext(entity);
  if (!next) return <p>{sunAllDay(entity) ?? "Waiting…"}</p>;
  return <p>{sunTime(next, hourCycle)}: {sunWhen(next, entity.now)}</p>;
}

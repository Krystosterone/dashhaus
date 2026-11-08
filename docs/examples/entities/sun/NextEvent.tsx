import { useHaSun } from "@dashhaus/core";
import { sunAllDay, sunNext, sunTime, sunWhen } from "@dashhaus/core/entities/sun/words";

/** When the sun next sets or rises, and how long until it. */
export function NextSunEvent() {
  const { entity } = useHaSun("sun.sun");
  if (entity.state === "unavailable") return <p>{entity.name} is unavailable</p>;
  const next = sunNext(entity);
  if (!next) return <p>{sunAllDay(entity) ?? "Waiting…"}</p>;
  return <p>{sunTime(next)}: {sunWhen(next, entity.now)}</p>;
}

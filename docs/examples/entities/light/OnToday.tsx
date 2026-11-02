import { useHaLight } from "@dashhaus/core";

/** How long a light has been on today, from the history the hook reads. */
export function OnToday({ entityId }: { entityId: string }) {
  const { entity, history } = useHaLight(entityId);
  const hours = Math.floor(history.onMinutes / 60);
  const minutes = history.onMinutes % 60;
  return (
    <p>
      {entity.name} has been on for {hours} h {minutes} min today.
    </p>
  );
}

import { useHaFan } from "@dashhaus/core";

/** On and off, and its speed when it has speeds: a slider with one stop per speed. */
export function Speed({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaFan(entityId);
  const count = entity.speedCount ?? 0;
  const step = 100 / Math.max(1, count);
  return (
    <fieldset disabled={entity.state === "unavailable"}>
      <legend>{entity.name}: {entity.state === "on" ? `${entity.percentage ?? "—"}%` : entity.state}</legend>
      <button type="button" aria-pressed={entity.state === "on"} onClick={actions.onToggle}>
        {entity.state === "on" ? "On" : "Off"}
      </button>
      {entity.supportsSpeed && count >= 2 && (
        <label>
          Speed
          <input
            type="range"
            min={step}
            max={100}
            step={step}
            value={entity.percentage ?? step}
            onChange={(event) => actions.onPercentageChange(event.currentTarget.valueAsNumber)}
          />
        </label>
      )}
    </fieldset>
  );
}

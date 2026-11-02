import { useHaHumidifier } from "@dashhaus/core";

/** The room's humidity, the target, and a slider for it when the device takes one. */
export function Humidity({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaHumidifier(entityId);
  const { onTargetChange } = actions;
  return (
    <fieldset disabled={entity.state === "unavailable"}>
      <legend>
        {entity.name} ({entity.kind ?? "humidifier"}): {entity.currentHumidity ?? "—"}% now
      </legend>
      <button type="button" aria-pressed={entity.state === "on"} onClick={actions.onToggle}>
        {entity.state === "on" ? "On" : "Off"}
      </button>
      {onTargetChange && (
        <label>
          Target {entity.targetHumidity}%
          <input
            type="range"
            min={entity.minHumidity}
            max={entity.maxHumidity}
            value={entity.targetHumidity ?? entity.minHumidity}
            onChange={(event) => onTargetChange(event.currentTarget.valueAsNumber)}
          />
        </label>
      )}
    </fieldset>
  );
}

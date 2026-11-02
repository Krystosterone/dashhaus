import { useHaClimate } from "@dashhaus/core";
import type { HvacMode } from "@dashhaus/core/entities/climate/types";

/** The unit's own modes; the handler is absent when Home Assistant lists none. */
export function ModePicker({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaClimate(entityId, { loadHistory: false });
  if (!actions.onModeChange || entity.state === "unavailable") return null;
  const onModeChange = actions.onModeChange;
  return (
    <label>
      Mode
      <select value={entity.state} onChange={(event) => onModeChange(event.currentTarget.value as HvacMode)}>
        {entity.hvacModes.map((mode) => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>
    </label>
  );
}

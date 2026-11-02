import { useHaHumidifier } from "@dashhaus/core";

/** The device's own modes (normal, eco, sleep, boost…), one button each. */
export function Modes({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaHumidifier(entityId, { loadHistory: false });
  const { onModeChange } = actions;
  if (!onModeChange || !entity.modes) return null;
  return (
    <div role="group" aria-label={`${entity.name} mode`}>
      {entity.modes.map((mode) => (
        <button key={mode} type="button" aria-pressed={entity.mode === mode} onClick={() => onModeChange(mode)}>
          {mode}
        </button>
      ))}
    </div>
  );
}

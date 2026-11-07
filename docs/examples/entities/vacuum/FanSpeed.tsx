import { useHaVacuum } from "@dashhaus/core";
import { fanSpeedLabel } from "@dashhaus/core/entities/vacuum/words";

/** Its fan speeds, the running one pressed: only where the vacuum declares them, in their own words. */
export function VacuumFanSpeed({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaVacuum(entityId, { loadHistory: false });
  if (!entity.supportsFanSpeed || !entity.fanSpeeds) return null;
  return (
    <div role="group" aria-label={`${entity.name} fan speed`}>
      {entity.fanSpeeds.map((speed) => (
        <button key={speed} type="button" aria-pressed={speed === entity.fanSpeed} onClick={() => actions.onFanSpeedChange(speed)}>
          {fanSpeedLabel(speed)}
        </button>
      ))}
    </div>
  );
}

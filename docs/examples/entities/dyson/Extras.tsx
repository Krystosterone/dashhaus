import { useHaDyson } from "@dashhaus/core";

/** Its sweep, its night mode and a Hot+Cool's heat: each only where the device has it. */
export function Extras({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaDyson(entityId, { loadHistory: false });
  return (
    <>
      {entity.oscillationModes && (
        <div role="group" aria-label={`${entity.name} oscillation`}>
          <button type="button" aria-pressed={entity.oscillating === false} onClick={() => actions.onOscillateChange(false)}>Off</button>
          {entity.oscillationModes.map((mode) => (
            <button key={mode} type="button" aria-pressed={entity.oscillating === true && entity.oscillationMode === mode} onClick={() => actions.onOscillationModeChange(mode)}>
              {mode}
            </button>
          ))}
        </div>
      )}
      {entity.supportsNightMode && (
        <button type="button" aria-pressed={entity.nightMode === true} onClick={() => actions.onNightModeChange(!entity.nightMode)}>Night mode</button>
      )}
      {entity.supportsHeat && (
        <>
          <button type="button" aria-pressed={entity.heatOn === true} onClick={() => actions.onHeatChange(!entity.heatOn)}>Heat</button>
          {entity.heatOn && entity.heatTarget != null && (
            <button type="button" onClick={() => actions.onHeatTargetChange(entity.heatTarget! + 1)}>Warmer than {entity.heatTarget}°</button>
          )}
        </>
      )}
    </>
  );
}

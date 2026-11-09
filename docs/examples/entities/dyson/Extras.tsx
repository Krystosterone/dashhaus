import { useHaDyson } from "@dashhaus/core";

/** Where it points and how widely it sweeps, its night mode and a Hot+Cool's heat: each only where the device has it. */
export function Extras({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaDyson(entityId, { loadHistory: false });
  return (
    <>
      {entity.oscillationCentre != null && (
        <div role="group" aria-label={`${entity.name} oscillation`}>
          <button type="button" aria-pressed={entity.oscillating === false} onClick={() => actions.onOscillateChange(false)}>Off</button>
          {[0, 45, 90, 180, 350].map((spread) => (
            <button key={spread} type="button" onClick={() => actions.onSpreadChange(spread)}>{spread ? `${spread}°` : "Still"}</button>
          ))}
          <button type="button" onClick={() => actions.onAimChange(entity.oscillationCentre! - 15)}>Turn left</button>
          <button type="button" onClick={() => actions.onAimChange(entity.oscillationCentre! + 15)}>Turn right</button>
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

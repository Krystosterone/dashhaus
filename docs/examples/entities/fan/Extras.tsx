import { useHaFan } from "@dashhaus/core";

/** Its presets, its sweep and a ceiling fan's direction: each only when the fan declares it. */
export function Extras({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaFan(entityId, { loadHistory: false });
  return (
    <>
      {entity.supportsPreset && (
        <div role="group" aria-label={`${entity.name} preset`}>
          {entity.presetModes?.map((preset) => (
            <button key={preset} type="button" aria-pressed={entity.presetMode === preset} onClick={() => actions.onPresetChange(preset)}>
              {preset}
            </button>
          ))}
        </div>
      )}
      {entity.supportsOscillate && (
        <button type="button" aria-pressed={entity.oscillating === true} onClick={() => actions.onOscillateChange(!entity.oscillating)}>
          Oscillate
        </button>
      )}
      {entity.supportsDirection && (
        <button type="button" onClick={() => actions.onDirectionChange(entity.direction === "forward" ? "reverse" : "forward")}>
          {entity.direction === "reverse" ? "Reverse" : "Forward"}
        </button>
      )}
    </>
  );
}

import { useHaLight } from "@dashhaus/core";

/** A brightness slider, and a warmth slider when the light takes a colour temperature. */
export function Dimmer({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaLight(entityId, { loadHistory: false });
  const unavailable = entity.state === "unavailable";

  return (
    <fieldset disabled={unavailable}>
      <legend>{entity.name}</legend>
      {entity.supportsBrightness && (
        <label>
          Brightness
          <input
            type="range"
            min={1}
            max={100}
            value={entity.brightness ?? 1}
            onChange={(event) => actions.onBrightnessChange(event.currentTarget.valueAsNumber)}
          />
        </label>
      )}
      {actions.onKelvinChange && entity.minKelvin != null && entity.maxKelvin != null && (
        <label>
          Warmth
          <input
            type="range"
            min={entity.minKelvin}
            max={entity.maxKelvin}
            step={100}
            value={entity.kelvin ?? entity.minKelvin}
            onChange={(event) => actions.onKelvinChange?.(event.currentTarget.valueAsNumber)}
          />
        </label>
      )}
    </fieldset>
  );
}

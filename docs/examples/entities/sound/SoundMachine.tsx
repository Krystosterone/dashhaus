import { useHaSound } from "@dashhaus/core";

/** A sound machine: its sound's switch, and its volume number found beside it. */
export function SoundMachine({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaSound(entityId);
  const { onVolumeChange } = actions;
  return (
    <fieldset disabled={entity.state === "unavailable"}>
      <legend>{entity.name}</legend>
      <button type="button" aria-pressed={entity.state === "on"} onClick={actions.onToggle}>
        {entity.state === "on" ? "Playing" : "Off"}
      </button>
      {onVolumeChange && (
        <label>
          Volume
          <input
            type="range"
            min={0}
            max={100}
            value={entity.volume ?? 0}
            onChange={(event) => onVolumeChange(event.currentTarget.valueAsNumber)}
          />
        </label>
      )}
    </fieldset>
  );
}

import { HaSound } from "@dashhaus/core";

/**
 * A sound is a switch, and nothing in a switch says it plays a sound, so the list is yours to name. The volume
 * entity is found beside each one unless you give it.
 */
const SOUNDS = [
  { entityId: "switch.nursery_music" },
  { entityId: "switch.bedroom_noise", volumeEntityId: "number.bedroom_noise_level" },
];

export function AllSounds() {
  return (
    <ul>
      {SOUNDS.map((sound) => (
        <li key={sound.entityId}>
          <HaSound {...sound} loadHistory={false}>
            {({ entity, actions }) => (
              <button type="button" aria-pressed={entity.state === "on"} onClick={actions.onToggle}>
                {entity.name}
                {entity.volume == null ? "" : `, volume ${entity.volume}%`}
              </button>
            )}
          </HaSound>
        </li>
      ))}
    </ul>
  );
}

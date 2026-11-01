import { useHaToggle } from "@dashhaus/core";

/** A mode as a switch: Guest mode, Do Not Disturb, an input_boolean or a switch. */
export function ModeSwitch({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaToggle(entityId);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={entity.state === "on"}
      disabled={entity.state === "unavailable"}
      onClick={actions.onToggle}
    >
      {entity.name}
    </button>
  );
}

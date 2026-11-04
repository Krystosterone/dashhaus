import { useHaLight } from "@dashhaus/core";

/** One light, drawn your way: the hook hands over the light and what it can do. */
export function LivingRoomLight() {
  const { entity, actions } = useHaLight("light.living_room");
  const on = entity.state === "on";

  return (
    <button type="button" aria-pressed={on} disabled={entity.state === "unavailable"} onClick={actions.onToggle}>
      {entity.name}: {on ? `on${entity.brightness == null ? "" : `, ${entity.brightness}%`}` : "off"}
    </button>
  );
}

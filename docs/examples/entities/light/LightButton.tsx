import { useHaLight } from "@dashhaus/core";

export function LightButton({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaLight(entityId);
  return (
    <button type="button" aria-pressed={entity.state === "on"} onClick={actions.onToggle}>
      {entity.name} {entity.state === "on" && entity.brightness != null ? `${entity.brightness}%` : entity.state}
    </button>
  );
}

import { useHaLight } from "@dashhaus/core";

export function LightButton({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaLight(entityId, { loadHistory: false });
  return (
    <button type="button" aria-pressed={entity.state === "on"} disabled={entity.state === "unavailable"} onClick={actions.onToggle}>
      {entity.name}
    </button>
  );
}

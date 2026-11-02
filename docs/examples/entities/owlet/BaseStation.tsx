import { useHaOwlet } from "@dashhaus/core";

/** The one action: the base station's switch. It is absent when there is no base station switch to read. */
export function BaseStation({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaOwlet(entityId, { loadHistory: false });
  if (!actions.onBaseToggle) return null;
  return (
    <button type="button" role="switch" aria-checked={entity.baseOn === true} onClick={actions.onBaseToggle}>
      Base station {entity.baseOn ? "on" : "off: no alarm sounds"}
    </button>
  );
}

import { useHaClimate } from "@dashhaus/core";

/** In heat_cool, the unit keeps the room between two setpoints; onRangeChange sets both at once. */
export function HeatCool({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaClimate(entityId, { loadHistory: false });
  const { targetLow: low, targetHigh: high, step } = entity;
  if (!actions.onRangeChange || entity.state !== "heat_cool" || low == null || high == null) return null;
  const setRange = actions.onRangeChange;
  return (
    <p>
      Keep between {low} and {high}
      {entity.unit}
      <button type="button" onClick={() => setRange(low - step, high + step)}>
        Widen
      </button>
      <button type="button" onClick={() => setRange(low + step, high - step)}>
        Narrow
      </button>
    </p>
  );
}

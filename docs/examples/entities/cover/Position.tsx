import { useHaCover } from "@dashhaus/core";

/** A position slider for a cover that reports one: 0 is closed, 100 open. */
export function Position({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaCover(entityId, { loadHistory: false });
  const { onSetPosition } = actions;
  if (!onSetPosition) return <p>{entity.name} only opens and closes.</p>;
  return (
    <label>
      {entity.name}
      <input
        type="range"
        min={0}
        max={100}
        value={entity.position ?? 0}
        disabled={entity.state === "unavailable"}
        onChange={(event) => onSetPosition(event.currentTarget.valueAsNumber)}
      />
    </label>
  );
}

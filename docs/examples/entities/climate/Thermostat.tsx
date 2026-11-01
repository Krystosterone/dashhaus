import { useHaClimate } from "@dashhaus/core";

export function Thermostat({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaClimate(entityId);
  const target = entity.targetTemperature;
  return (
    <div>
      <p>
        {entity.name}: {entity.currentTemperature ?? "—"}
        {entity.unit}, {entity.hvacAction ?? entity.state}
      </p>
      {target != null && (
        <>
          <button type="button" onClick={() => actions.onTargetChange(target - entity.step)}>
            Cooler
          </button>
          <span>
            {target}
            {entity.unit}
          </span>
          <button type="button" onClick={() => actions.onTargetChange(target + entity.step)}>
            Warmer
          </button>
        </>
      )}
    </div>
  );
}

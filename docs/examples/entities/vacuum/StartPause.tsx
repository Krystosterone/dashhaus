import { useHaVacuum } from "@dashhaus/core";
import { pressWord, vacuumPress, vacuumWord } from "@dashhaus/core/entities/vacuum/words";

/**
 * One button that does what the vacuum can do now: pause it while it moves, start or resume it while it stands. What it
 * can do comes from what it declares to Home Assistant, so a vacuum that can't pause is sent home instead.
 */
export function RobotVacuum({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaVacuum(entityId, { loadHistory: false });
  const press = vacuumPress(entity);
  const run = { start: actions.onStart, pause: actions.onPause, return: actions.onReturnToBase };

  return (
    <p>
      {entity.name}: {vacuumWord(entity)}
      {entity.battery != null && `, battery ${entity.battery}%`}
      {press && <button type="button" onClick={run[press]}>{pressWord(press, entity)}</button>}
    </p>
  );
}

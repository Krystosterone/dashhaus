import { useHaAlarm } from "@dashhaus/core";
import { useDelayLeft } from "@dashhaus/core/hooks";

const WORDS: Record<string, string> = {
  disarmed: "Disarmed",
  arming: "Arming",
  pending: "Entry delay",
  triggered: "Triggered",
  unavailable: "Unavailable",
};

/** The panel's state, with the exit or entry delay counting down when the host knows its length. */
export function AlarmState({ entityId }: { entityId: string }) {
  const { entity } = useHaAlarm(entityId, { exitDelay: 30, entryDelay: 30 });
  const counting = entity.state === "arming" || entity.state === "pending";
  const left = useDelayLeft(entity.delay, entity.changedAt, counting);
  return (
    <p role="status">
      {entity.name}: {WORDS[entity.state] ?? entity.state.replace("armed_", "Armed ")}
      {left != null && `, ${left} s`}
      {entity.triggeredBy && ` by ${entity.triggeredBy}`}
    </p>
  );
}

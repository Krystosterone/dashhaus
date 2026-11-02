import { useHaHistory } from "@dashhaus/core";
import { useNow } from "@dashhaus/core/hooks";

/** Today's raw state changes for any entity: the recorder's day, extended by every live change since. */
export function DoorLog({ entityId }: { entityId: string }) {
  const now = useNow();
  const records = useHaHistory([entityId], true, now);
  if (!records) return null;
  const openings = records.filter((record) => record.state === "on");
  return (
    <ol aria-label="Opened today">
      {openings.map((record) => (
        <li key={record.changed.getTime()}>{record.changed.toLocaleTimeString([], { timeStyle: "short" })}</li>
      ))}
    </ol>
  );
}

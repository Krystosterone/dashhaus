import { HaAlarm, useHaSelector } from "@dashhaus/core";
import type { HaSnapshot } from "@dashhaus/core";

const alarmIds = (snapshot: HaSnapshot) =>
  Object.keys(snapshot.entities).filter((id) => id.startsWith("alarm_control_panel.")).sort().join(" ");

export function AllAlarms() {
  const ids = useHaSelector(alarmIds).split(" ").filter(Boolean);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <HaAlarm entityId={id} loadHistory={false}>
            {({ entity }) => (
              <>
                {entity.name}: {entity.state}
                {entity.openSensors?.length ? ` (open: ${entity.openSensors.join(", ")})` : ""}
              </>
            )}
          </HaAlarm>
        </li>
      ))}
    </ul>
  );
}

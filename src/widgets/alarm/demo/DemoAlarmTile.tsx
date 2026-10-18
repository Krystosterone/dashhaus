import { AlarmTile } from "../AlarmTile";
import { ALARM_SEEDS, useDemoAlarm } from "./useDemoAlarm";
import type { AlarmSeedName } from "./useDemoAlarm";

export interface DemoAlarmTileProps {
  /** Which example panel to show. */
  alarm: AlarmSeedName;
  /** Container width in px. The widget picks its size from this. */
  width?: number;
  density?: "regular" | "thin";
  /** Thin only: false hides the control; the row opens the details sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** An AlarmTile wired to local demo state (code 1234). */
export function DemoAlarmTile({ alarm, width, density, showControl, defaultOpen }: DemoAlarmTileProps) {
  const demo = useDemoAlarm(ALARM_SEEDS[alarm]);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <AlarmTile {...demo} density={density} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}

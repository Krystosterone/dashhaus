import { AlarmTile } from "../AlarmTile";
import { ALARM_SEEDS, useDemoAlarm } from "./useDemoAlarm";
import type { AlarmSeedName } from "./useDemoAlarm";

export interface DemoAlarmTileProps {
  /** Which example panel to show. */
  alarm: AlarmSeedName;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: "compact" | "standard" | "featured";
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
  /** View only: the panel can be read but not controlled (no arm, disarm or keypad). */
  readOnly?: boolean;
}

/** An AlarmTile wired to local demo state (code 1234). */
export function DemoAlarmTile({ alarm, width, footprint, showControl, defaultOpen, readOnly }: DemoAlarmTileProps) {
  const demo = useDemoAlarm(ALARM_SEEDS[alarm]);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <AlarmTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} readOnly={readOnly} />
    </div>
  );
}

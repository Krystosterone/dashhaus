import { CalendarTile } from "../CalendarTile";
import { CALENDAR_SEEDS } from "@dashhaus/core/seeds/calendar";
import type { CalendarSeedName, CalendarSeed } from "@dashhaus/core/seeds/calendar";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoCalendarTileProps {
  /** Which example to show. */
  seed: CalendarSeedName | CalendarSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the reading; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

/** A CalendarTile with example data. */
export function DemoCalendarTile({ seed, width, footprint, showControl, defaultOpen }: DemoCalendarTileProps) {
  const s = (typeof seed === "string" ? CALENDAR_SEEDS[seed] : seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <CalendarTile entity={s.entity} history={s.history} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}

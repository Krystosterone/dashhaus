import { HomeTile } from "../HomeTile";
import { HOME_SEEDS } from "./home";
import type { HomeSeedName } from "./home";

export interface DemoHomeTileProps {
  /** Which example weather to show. */
  weather: HomeSeedName;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: "compact" | "standard" | "featured";
  /** Compact only: false hides the reading; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

export function DemoHomeTile({ weather, width, footprint, showControl, defaultOpen }: DemoHomeTileProps) {
  const s = HOME_SEEDS[weather];
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <HomeTile entity={s.entity} history={s.history} hourly={s.hourly} daily={s.daily} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}

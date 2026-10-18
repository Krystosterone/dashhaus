import { HomeTile } from "../HomeTile";
import { HOME_SEEDS } from "./home";
import type { HomeSeedName } from "./home";

export interface DemoHomeTileProps {
  /** Which example weather to show. */
  weather: HomeSeedName;
  /** Container width in px. The widget picks its size from this. */
  width?: number;
  density?: "regular" | "thin";
  /** Thin only: false hides the control; the row opens the details sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
}

export function DemoHomeTile({ weather, width, density, showControl, defaultOpen }: DemoHomeTileProps) {
  const s = HOME_SEEDS[weather];
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <HomeTile entity={s.entity} history={s.history} hourly={s.hourly} daily={s.daily} density={density} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}

import { HumidifierTile } from "../HumidifierTile";
import { HUMIDIFIER_SEEDS, useDemoHumidifier } from "@dashhaus/core/seeds/humidifier";
import type { HumidifierSeedName, HumidifierSeed } from "@dashhaus/core/seeds/humidifier";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoHumidifierTileProps {
  /** Which example to show. */
  seed: HumidifierSeedName | HumidifierSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
  /** Override the humidifier's name. */
  name?: string;
  /** Override the area. */
  area?: string;
}

/** A HumidifierTile wired to local demo state. */
export function DemoHumidifierTile({ seed, width, footprint, showControl, defaultOpen, name, area }: DemoHumidifierTileProps) {
  const given = typeof seed === "string" ? HUMIDIFIER_SEEDS[seed] : seed;
  const demo = useDemoHumidifier(name || area ? { ...given, entity: { ...given.entity, ...(name ? { name } : {}), ...(area ? { area } : {}) } } : given);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <HumidifierTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}

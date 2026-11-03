import { LightTile } from "../LightTile";
import { LIGHT_SEEDS, useDemoLight } from "@dashhaus/core/seeds/light";
import type { LightSeedName, LightSeed } from "@dashhaus/core/seeds/light";

export interface DemoLightTileProps {
  /** Which example light to show. */
  light: LightSeedName | LightSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  /** Shared card footprint. */
  footprint?: "compact" | "standard" | "featured";
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  /** Override the light's name. */
  name?: string;
  /** Override the area. */
  area?: string;
  defaultOpen?: boolean;
}

/** A LightTile wired to local demo state. */
export function DemoLightTile({ light, width, footprint, showControl, name, area, defaultOpen }: DemoLightTileProps) {
  const seed = (typeof light === "string" ? LIGHT_SEEDS[light] : light);
  const demo = useDemoLight(seed, { ...(name ? { name } : {}), ...(area ? { area } : {}) });
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <LightTile {...demo} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}

import { LightTile } from "../LightTile";
import { SEEDS, useDemoLight } from "./useDemoLight";
import type { SeedName } from "./useDemoLight";

export interface DemoLightTileProps {
  /** Which example light to show. */
  light: SeedName;
  /** Container width in px. The widget picks its size from this. */
  width?: number;
  /** Regular card or one-row thin variant. */
  density?: "regular" | "thin";
  /** Thin only: false hides the control; the row opens the details sheet. */
  showControl?: boolean;
  /** Override the light's name. */
  name?: string;
  /** Override the area. */
  area?: string;
  defaultOpen?: boolean;
}

/** A LightTile wired to local demo state. */
export function DemoLightTile({ light, width, density, showControl, name, area, defaultOpen }: DemoLightTileProps) {
  const seed = SEEDS[light];
  const demo = useDemoLight(seed, { ...(name ? { name } : {}), ...(area ? { area } : {}) });
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <LightTile {...demo} density={density} showControl={showControl} defaultOpen={defaultOpen} />
    </div>
  );
}

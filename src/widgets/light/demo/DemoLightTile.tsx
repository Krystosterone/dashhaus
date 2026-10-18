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
  /** Override the light's name. */
  name?: string;
  /** Override the area. */
  area?: string;
  defaultOpen?: boolean;
}

/** A LightTile wired to local demo state. */
export function DemoLightTile({ light, width, density, name, area, defaultOpen }: DemoLightTileProps) {
  const seed = SEEDS[light];
  const demo = useDemoLight(seed, { ...(name ? { name } : {}), ...(area ? { area } : {}) });
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <LightTile {...demo} density={density} defaultOpen={defaultOpen} />
    </div>
  );
}

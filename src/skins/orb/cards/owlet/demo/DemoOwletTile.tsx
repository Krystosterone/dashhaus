import { useState } from "react";
import { OwletTile } from "../OwletTile";
import { OWLET_SEEDS } from "@dashhaus/core/seeds/owlet";
import type { OwletSeedName, OwletSeed } from "@dashhaus/core/seeds/owlet";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoOwletTileProps {
  /** Which example sock to show. */
  seed: OwletSeedName | OwletSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the readings; the row opens the detail sheet. */
  showControl?: boolean;
  /** Override the baby's name. */
  name?: string;
  defaultOpen?: boolean;
}

/** An OwletTile with example data; its base station switches locally. */
export function DemoOwletTile({ seed, width, footprint, showControl, name, defaultOpen }: DemoOwletTileProps) {
  const s = (typeof seed === "string" ? OWLET_SEEDS[seed] : seed);
  const [baseOn, setBaseOn] = useState(("baseOn" in s.entity ? s.entity.baseOn : undefined) ?? true);
  const entity = { ...s.entity, baseOn, ...(name ? { name } : {}) };
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <OwletTile entity={entity} history={s.history} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} onBaseToggle={() => setBaseOn((on) => !on)} />
    </div>
  );
}

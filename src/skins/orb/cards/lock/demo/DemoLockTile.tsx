import { LockTile } from "../LockTile";
import { LOCK_SEEDS, useDemoLock } from "@dashhaus/core/seeds/lock";
import type { LockSeedName, LockSeed } from "@dashhaus/core/seeds/lock";
import type { LockAction } from "@dashhaus/core/entities/lock/types";
import type { CardFootprint } from "../../../shared/ui";

export interface DemoLockTileProps {
  /** Which example to show. */
  seed: LockSeedName | LockSeed;
  /** Container width in px. Width changes anatomy; the selected footprint keeps its height. */
  width?: number;
  footprint?: CardFootprint;
  /** Compact only: false hides the control; the row opens the detail sheet. */
  showControl?: boolean;
  defaultOpen?: boolean;
  /** With defaultOpen: the sheet opens on this action's confirmation or keypad. */
  defaultAction?: LockAction;
  /** View only: nothing to lock or unlock. */
  readOnly?: boolean;
}

/** A LockTile wired to local demo state. */
export function DemoLockTile({ seed, width, footprint, showControl, defaultOpen, defaultAction, readOnly }: DemoLockTileProps) {
  const demo = useDemoLock(typeof seed === "string" ? LOCK_SEEDS[seed] : seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <LockTile {...demo} readOnly={readOnly} footprint={footprint} showControl={showControl} defaultOpen={defaultOpen} defaultAction={defaultAction} />
    </div>
  );
}

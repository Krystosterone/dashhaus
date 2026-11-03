import { useState } from "react";
import { LockCard, LockSheet } from "./LockCard";
import type { LockCardProps } from "./LockCard";
import type { LockAction } from "@dashhaus/core/entities/lock/types";

export interface LockTileProps extends Omit<LockCardProps, "variant" | "onOpenDetails" | "onClose" | "action"> {
  defaultOpen?: boolean;
  /** With `defaultOpen`: open the sheet on this action's confirmation or keypad. */
  defaultAction?: LockAction;
}

/** A dashboard-ready lock: the card, plus its sheet, which opens on the confirmation or keypad when an unlock is asked for. */
export function LockTile({ defaultOpen = false, defaultAction, footprint, ...props }: LockTileProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [action, setAction] = useState<LockAction | undefined>(defaultOpen ? defaultAction : undefined);
  return (
    <>
      <div className="hd-c">
        <LockCard {...props} footprint={footprint} onOpenDetails={(a) => { setAction(a); setOpen(true); }} />
      </div>
      <LockSheet {...props} action={action} open={open} onClose={() => { setOpen(false); setAction(undefined); }} />
    </>
  );
}

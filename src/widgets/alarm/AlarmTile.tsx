import { useState } from "react";
import { AlarmWidget, AlarmSheet } from "./AlarmWidget";
import type { AlarmWidgetProps } from "./AlarmWidget";
import type { AlarmAction } from "../../domains/alarm/types";

export interface AlarmTileProps extends Omit<AlarmWidgetProps, "variant" | "onOpenDetails" | "onClose" | "action"> {
  defaultOpen?: boolean;
}

/** A dashboard-ready alarm: the card, plus its sheet, which opens on the keypad when an action needs the code. */
export function AlarmTile({ defaultOpen = false, footprint, ...props }: AlarmTileProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [action, setAction] = useState<AlarmAction | undefined>(undefined);
  return (
    <>
      <div className="hd-c">
        <AlarmWidget {...props} footprint={footprint} onOpenDetails={(a) => { setAction(a); setOpen(true); }} />
      </div>
      <AlarmSheet {...props} action={action} open={open} onClose={() => { setOpen(false); setAction(undefined); }} />
    </>
  );
}

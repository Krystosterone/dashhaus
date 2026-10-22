import { useState } from "react";
import { SensorWidget, SensorSheet } from "./SensorWidget";
import type { SensorWidgetProps } from "./SensorWidget";

export interface SensorTileProps extends Omit<SensorWidgetProps, "variant" | "onOpenDetails" | "onClose"> {
  defaultOpen?: boolean;
}

/** A dashboard-ready sensor: the card in its size container, plus its detail sheet. */
export function SensorTile({ defaultOpen = false, footprint, ...props }: SensorTileProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <div className="hd-c">
        <SensorWidget {...props} footprint={footprint} onOpenDetails={() => setOpen(true)} />
      </div>
      <SensorSheet {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

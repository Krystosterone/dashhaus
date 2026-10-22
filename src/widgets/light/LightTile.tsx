import { useState } from "react";
import { LightWidget, LightSheet } from "./LightWidget";
import type { LightWidgetProps } from "./LightWidget";

export interface LightTileProps extends Omit<LightWidgetProps, "variant" | "onOpenDetails" | "onClose"> {
  /** Start with the detail sheet open. */
  defaultOpen?: boolean;
}

/** A dashboard-ready light: the card in its size container, plus its detail sheet. */
export function LightTile({ defaultOpen = false, footprint, ...props }: LightTileProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <div className="hd-c">
        <LightWidget {...props} footprint={footprint} onOpenDetails={() => setOpen(true)} />
      </div>
      <LightSheet {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

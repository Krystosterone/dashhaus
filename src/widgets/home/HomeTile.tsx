import { useState } from "react";
import { HomeWidget, HomeSheet } from "./HomeWidget";
import type { HomeWidgetProps } from "./HomeWidget";

export interface HomeTileProps extends Omit<HomeWidgetProps, "variant" | "onOpenDetails" | "onClose"> {
  defaultOpen?: boolean;
}

/** A dashboard-ready home weather card: the card in its size container, plus its detail sheet. */
export function HomeTile({ defaultOpen = false, footprint, ...props }: HomeTileProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <div className="hd-c">
        <HomeWidget {...props} footprint={footprint} onOpenDetails={() => setOpen(true)} />
      </div>
      <HomeSheet {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

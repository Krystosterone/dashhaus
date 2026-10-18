import { useState } from "react";
import { CoverWidget, CoverSheet } from "./CoverWidget";
import type { CoverWidgetProps } from "./CoverWidget";

export interface CoverTileProps extends Omit<CoverWidgetProps, "variant" | "onOpenDetails" | "onClose"> {
  defaultOpen?: boolean;
}

/** A dashboard-ready cover: the card in its size container, plus its detail sheet. */
export function CoverTile({ defaultOpen = false, density, ...props }: CoverTileProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <div className="hd-c">
        <CoverWidget {...props} density={density} onOpenDetails={() => setOpen(true)} />
      </div>
      <CoverSheet {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

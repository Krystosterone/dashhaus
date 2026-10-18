import { useState } from "react";
import { ClimateWidget, ClimateSheet } from "./ClimateWidget";
import type { ClimateWidgetProps } from "./ClimateWidget";

export interface ClimateTileProps extends Omit<ClimateWidgetProps, "variant" | "onOpenDetails" | "onClose"> {
  defaultOpen?: boolean;
}

/** A dashboard-ready climate entity: the card in its size container, plus its detail sheet. */
export function ClimateTile({ defaultOpen = false, density, ...props }: ClimateTileProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <div className="hd-c">
        <ClimateWidget {...props} density={density} onOpenDetails={() => setOpen(true)} />
      </div>
      <ClimateSheet {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

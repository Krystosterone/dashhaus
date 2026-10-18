import { useState } from "react";
import { ToggleWidget, ToggleSheet } from "./ToggleWidget";
import type { ToggleWidgetProps } from "./ToggleWidget";

export interface ToggleTileProps extends Omit<ToggleWidgetProps, "variant" | "onOpenDetails" | "onClose"> {
  defaultOpen?: boolean;
}

/** A dashboard-ready toggle: the card in its size container, plus its detail sheet. */
export function ToggleTile({ defaultOpen = false, density, ...props }: ToggleTileProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <div className="hd-c">
        <ToggleWidget {...props} density={density} onOpenDetails={() => setOpen(true)} />
      </div>
      <ToggleSheet {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

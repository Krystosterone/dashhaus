import { useState } from "react";
import { WeatherWidget, WeatherSheet } from "./WeatherWidget";
import type { WeatherWidgetProps } from "./WeatherWidget";

export interface WeatherTileProps extends Omit<WeatherWidgetProps, "variant" | "onOpenDetails" | "onClose"> {
  defaultOpen?: boolean;
}

/** A dashboard-ready weather card: the card in its size container, plus its detail sheet. */
export function WeatherTile({ defaultOpen = false, footprint, ...props }: WeatherTileProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <div className="hd-c">
        <WeatherWidget {...props} footprint={footprint} onOpenDetails={() => setOpen(true)} />
      </div>
      <WeatherSheet {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

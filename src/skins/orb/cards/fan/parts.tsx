import { SliderTrack } from "../../shared/ui";
import { percentOf, speedOf, speedText } from "@dashhaus/core/entities/fan/speed";
import { speedValueText } from "@dashhaus/core/entities/fan/labels";

/** Width of the filled end cap, in px. Matches --cap in FanCard.css. */
const THUMB = 30;

/**
 * Speed groove: the light card's brightness bar, counted in the fan's own speeds. A three-speed fan's groove
 * has three stops, so a drag or an arrow key moves one speed; a stepless fan's moves one percent. It hands back
 * the percentage the speed stands for. Setting the speed the thumb already shows still reports it while off, so
 * a tap on the groove turns the fan on at that speed.
 */
export function SpeedBar({ id, label, percent, count, on, onChange }: { id: string; label: string; percent: number; count: number; on: boolean; onChange: (percent: number) => void }) {
  return (
    <SliderTrack
      id={id}
      label={label}
      slider={{
        value: speedOf(percent, count), min: 1, max: count, inset: THUMB / 2, reportUnchanged: !on,
        onChange: (speed) => onChange(percentOf(speed, count)),
        valueText: (speed) => speedValueText(speed, count, on),
      }}
      className="fn-bar"
      text={(speed) => (on ? speedText(percentOf(speed, count), count) : "Off")}
      lit={on}
    />
  );
}

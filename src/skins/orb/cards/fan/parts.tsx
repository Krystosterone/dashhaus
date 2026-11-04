import { LevelBar } from "../../shared/ui";
import { percentOf, speedOf, speedText } from "@dashhaus/core/entities/fan/speed";
import { speedValueText } from "@dashhaus/core/entities/fan/labels";

/**
 * Speed groove: the fan's level, counted in its own speeds. A three-speed fan's groove has three stops, so a drag
 * or an arrow key moves one speed; a stepless fan's moves one percent. It hands back the percentage the speed
 * stands for. Setting it while off turns the fan on at that speed.
 */
export function SpeedBar({ id, label, percent, count, on, onChange }: { id: string; label: string; percent: number; count: number; on: boolean; onChange: (percent: number) => void }) {
  return (
    <LevelBar
      id={id}
      label={label}
      value={speedOf(percent, count)}
      min={1}
      max={count}
      on={on}
      wakes
      text={(speed) => speedText(percentOf(speed, count), count)}
      valueText={(speed) => speedValueText(speed, count, on)}
      onChange={(speed) => onChange(percentOf(speed, count))}
    />
  );
}

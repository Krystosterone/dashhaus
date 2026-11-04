import { LevelBar } from "../../shared/ui";

/** Volume groove: the sound's level, in percent. Setting it never switches the sound, so the groove stays empty
 *  while the sound is off and says so. */
export function VolumeBar({ id, value, on, onChange }: { id: string; value: number; on: boolean; onChange: (v: number) => void }) {
  return (
    <LevelBar
      id={id}
      heading="Volume"
      value={value}
      min={0}
      max={100}
      on={on}
      text={(pct) => `${pct}%`}
      offText={(pct) => `Off · ${pct}%`}
      valueText={(v) => (on ? `${v} percent` : `${v} percent, sound off`)}
      onChange={onChange}
    />
  );
}

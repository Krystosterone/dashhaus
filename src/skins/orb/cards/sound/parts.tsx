import { SOUND_OFF_SAID, soundVolumeReason } from "@dashhaus/core/entities/sound/words";
import { VOLUME, volumeSaid, volumeText } from "@dashhaus/core/entities/volume";
import { LevelBar } from "../../shared/ui";

/** Volume groove: the sound's level, in percent. A loudness fills only while it sounds (spec/cards.md → What every
 *  card shows), and setting it never switches the sound, so the groove stays empty while the sound is off and says
 *  why first: "Off · 62%". */
export function VolumeBar({ id, value, on, onChange }: { id: string; value: number; on: boolean; onChange: (v: number) => void }) {
  return (
    <LevelBar
      id={id}
      heading={VOLUME}
      value={value}
      min={0}
      max={100}
      on={on}
      text={(pct) => `${pct}%`}
      offText={(pct) => volumeText(pct, soundVolumeReason({ state: "off" }))}
      valueText={(v) => volumeSaid(v, on ? undefined : SOUND_OFF_SAID)}
      onChange={onChange}
    />
  );
}

import { SliderTrack } from "../../shared/ui";

/** Width of the filled end cap, in px. Matches --cap in SoundCard.css. */
const THUMB = 30;

/** Volume groove: the accent fills the track while the sound plays; the label inverts where the fill passes.
 *  Setting it never switches the sound, so the groove stays empty while the sound is off and says so. */
export function VolumeBar({ id, value, on, onChange }: { id: string; value: number; on: boolean; onChange: (v: number) => void }) {
  return (
    <SliderTrack
      id={id}
      slider={{ value: Math.round(value), min: 0, max: 100, inset: THUMB / 2, onChange, valueText: (v) => (on ? `${v} percent` : `${v} percent, sound off`) }}
      heading={() => <label htmlFor={id}>Volume</label>}
      className="sn-bar"
      text={(pct) => (on ? `${pct}%` : `Off · ${pct}%`)}
      lit={on}
    />
  );
}

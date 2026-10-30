import { Track } from "../../shared/ui";
import { useSlider } from "@dashhaus/core/primitives";

/** Width of the filled end cap, in px. Matches --cap in SoundCard.css. */
const THUMB = 30;

/** Volume groove: the accent fills the track while the sound plays; the label inverts where the fill passes.
 *  Setting it never switches the sound, so the groove stays empty while the sound is off and says so. */
export function VolumeBar({ id, value, on, onChange }: { id: string; value: number; on: boolean; onChange: (v: number) => void }) {
  const slider = useSlider<HTMLDivElement>({
    value: Math.round(value), min: 0, max: 100, inset: THUMB / 2, onChange,
    valueText: (v) => (on ? `${v} percent` : `${v} percent, sound off`),
  });
  const pct = slider.value;
  return (
    <div className="hd-blk">
      <p className="hd-blk-h"><label htmlFor={id}>Volume</label></p>
      <Track
        slider={slider}
        inputs={[{ id, ...slider.inputProps }]}
        className="sn-bar"
        text={on ? `${pct}%` : `Off · ${pct}%`}
        lit={on}
        style={{ "--v": slider.fraction(pct).toFixed(4) }}
      />
    </div>
  );
}

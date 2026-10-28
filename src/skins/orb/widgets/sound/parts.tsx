import type { Vars } from "../../shared/ui";
import { useSlider } from "../../../../primitives/slider";

/** Width of the filled end cap, in px. Matches the clip-path in SoundWidget.css. */
const THUMB = 30;

/** Volume groove: the accent fills it while the sound plays; the label inverts where the fill passes.
 *  Setting it never switches the sound, so the groove stays empty while the sound is off and says so.
 *  Pointer input goes to a hit layer (tap anywhere, or drag); the range input is for keyboard and screen readers. */
export function VolumeBar({ id, value, on, onChange }: { id: string; value: number; on: boolean; onChange: (v: number) => void }) {
  const slider = useSlider<HTMLDivElement>({
    value: Math.round(value), min: 0, max: 100, inset: THUMB / 2, onChange,
    valueText: (v) => (on ? `${v} percent` : `${v} percent, sound off`),
  });
  const pct = slider.value;
  const text = on ? `${pct}%` : `Off · ${pct}%`;
  return (
    <div className="hd-blk">
      <p className="hd-blk-h"><label htmlFor={id}>Volume</label></p>
      <div className="sn-bar" {...slider.rootProps} data-lit={on} style={{ "--v": slider.fraction(pct).toFixed(4) } as Vars}>
        <div className="sn-bar-lab">{text}</div>
        <div className="sn-bar-lit" aria-hidden="true"><div className="sn-bar-lab">{text}</div></div>
        <div className="sn-hit" {...slider.hitProps} />
        <input id={id} className="sn-in" {...slider.inputProps} />
      </div>
    </div>
  );
}

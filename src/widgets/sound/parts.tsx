import type { Vars } from "../../shared/ui";
import { useTrack, trackPos } from "../../shared/useTrack";

/** Width of the filled end cap, in px. Matches the clip-path in SoundWidget.css. */
const THUMB = 30;

/** Volume groove: the accent fills it while the sound plays; the label inverts where the fill passes.
 *  Setting it never switches the sound, so the groove stays empty while the sound is off and says so.
 *  Pointer input goes to a hit layer (tap anywhere, or drag); the range input is for keyboard and screen readers. */
export function VolumeBar({ id, value, on, onChange }: { id: string; value: number; on: boolean; onChange: (v: number) => void }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const text = on ? `${pct}%` : `Off · ${pct}%`;
  const track = useTrack<HTMLDivElement>((x, el) => {
    const v = Math.round(trackPos(x, el.getBoundingClientRect(), THUMB / 2) * 100);
    if (v !== pct) onChange(v);
  });
  return (
    <div className="hd-blk">
      <p className="hd-blk-h"><label htmlFor={id}>Volume</label></p>
      <div className="sn-bar" ref={track.ref} data-lit={on} style={{ "--v": (pct / 100).toFixed(4) } as Vars}>
        <div className="sn-bar-lab">{text}</div>
        <div className="sn-bar-lit" aria-hidden="true"><div className="sn-bar-lab">{text}</div></div>
        <div className="sn-hit" aria-hidden="true" {...track.handlers} />
        <input
          id={id}
          className="sn-in"
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          aria-valuetext={on ? `${pct} percent` : `${pct} percent, sound off`}
          onKeyDown={track.onKeyDown}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

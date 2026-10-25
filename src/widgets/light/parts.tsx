import type { Vars } from "../../shared/ui";
import { useTrack, trackPos } from "../../shared/useTrack";
import { kelvinName, warmGradient, K_MIN, K_MAX } from "./kelvin";
import { LAMP_COLORS, swatchColor } from "./color";
import type { LampColor } from "./color";

export const IconBulb = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 3.2a4.8 4.8 0 0 0-2.9 8.6c.5.4.8 1 .8 1.6v.5h4.2v-.5c0-.6.3-1.2.8-1.6A4.8 4.8 0 0 0 10 3.2Z" />
    <path d="M8.3 16.5h3.4" />
  </svg>
);
export const IconBulbOff = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 3.2a4.8 4.8 0 0 0-2.9 8.6c.5.4.8 1 .8 1.6v.5h4.2v-.5c0-.6.3-1.2.8-1.6A4.8 4.8 0 0 0 10 3.2Z" />
    <path d="M8.3 16.5h3.4" />
    <path d="M3.5 3.5l13 13" />
  </svg>
);

/** Brightness bar: the light fills it; the label inverts where it passes.
 *  Pointer input goes to a hit layer (tap anywhere, or drag); the range input is for keyboard and screen readers. */
export function BrightnessBar({ id, label, value, on, onChange }: { id: string; label: string; value: number; on: boolean; onChange: (v: number) => void }) {
  const pct = Math.min(100, Math.max(1, Math.round(value)));
  const text = on ? `${pct}%` : "Off";
  const track = useTrack<HTMLDivElement>((x, el) => {
    const v = Math.round(1 + trackPos(x, el.getBoundingClientRect(), THUMB / 2) * 99);
    if (v !== pct || !on) onChange(v);
  });
  return (
    <div className="lw-bar" ref={track.ref} data-lit={on} style={{ "--v": ((pct - 1) / 99).toFixed(4) } as Vars}>
      <div className="lw-bar-lab">{text}</div>
      <div className="lw-bar-lit" aria-hidden="true"><div className="lw-bar-lab">{text}</div></div>
      <div className="lw-hit" aria-hidden="true" {...track.handlers} />
      <input
        id={id}
        className="lw-in"
        type="range"
        min={1}
        max={100}
        step={1}
        value={pct}
        aria-label={label}
        aria-valuetext={on ? `${pct} percent` : `Off. Last set to ${pct} percent`}
        onKeyDown={track.onKeyDown}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
/** Width of the lit end cap, in px. Matches the clip-path in LightWidget.css. */
const THUMB = 30;

export const QUICK_LEVELS = [
  { value: 5, label: "Night", sub: "5%" },
  { value: 25, label: "Dim", sub: "25%" },
  { value: 50, label: "Half", sub: "50%" },
  { value: 100, label: "Full", sub: "100%" },
];

/** Warmth ruler: ticks every 100 K over the warm-to-cool scale; an ink stick and a tag mark the value. */
export function WarmthRuler({ id, kelvin, min = K_MIN, max = K_MAX, disabled, onChange }: { id: string; kelvin: number; min?: number; max?: number; disabled?: boolean; onChange: (k: number) => void }) {
  const span = Math.max(100, max - min);
  const k = Math.min(max, Math.max(min, kelvin));
  const intervals = Math.max(1, Math.round(span / 100));
  const track = useTrack<HTMLDivElement>((x, el) => {
    if (disabled) return;
    const v = Math.min(max, Math.round((min + trackPos(x, el.getBoundingClientRect(), 12) * span) / 100) * 100);
    if (v !== k) onChange(Math.max(min, v));
  });
  return (
    <div className="hd-blk">
      <p className="hd-blk-h"><label htmlFor={id}>Warmth</label><span className="hd-blk-v">{kelvinName(k)}</span></p>
      <div
        className="lw-ruler"
        ref={track.ref}
        data-disabled={disabled || undefined}
        style={{ "--v": ((k - min) / span).toFixed(4), "--warm-grad": warmGradient(min, Math.max(max, min + 100)) } as Vars}
      >
        <div className="lw-ruler-ticks" style={{ background: `repeating-linear-gradient(90deg, var(--tick) 0 1.5px, transparent 1.5px calc(100% / ${intervals}))` }} />
        <div className="lw-ruler-line" />
        <div className="lw-ruler-rail" aria-hidden="true">
          <div className="lw-ruler-at lw-ruler-at--mark"><div className="lw-ruler-mark" /></div>
          <div className="lw-ruler-at lw-ruler-at--tip"><div className="lw-ruler-tip">{k} K</div></div>
        </div>
        <div className="lw-hit" aria-hidden="true" {...track.handlers} />
        <input
          id={id}
          className="lw-in"
          type="range"
          min={min}
          max={Math.max(max, min + 100)}
          step={100}
          value={k}
          disabled={disabled}
          aria-valuetext={`${k} kelvin, ${kelvinName(k)}`}
          onKeyDown={track.onKeyDown}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

/** Colour chips: one per lamp colour, each with its swatch; the lamp's own is selected. Choosing one while
 *  off turns the lamp on in it. The swatches are the one place on the card system a lamp's hue is drawn. */
export function ColorChips({ id, value, onChange }: { id: string; value: LampColor | null; onChange: (c: LampColor) => void }) {
  return (
    <div className="hd-blk">
      <p className="hd-blk-h"><span id={id}>Colour</span>{value && <span className="hd-blk-v">{value.name}</span>}</p>
      <div className="hd-chips" role="group" aria-labelledby={id} style={{ "--n": LAMP_COLORS.length } as Vars}>
        {LAMP_COLORS.map((c) => (
          <button key={c.name} type="button" className="hd-chip lw-chip" aria-pressed={value?.name === c.name} onClick={() => onChange(c)}>
            <span className="lw-sw" aria-hidden="true" style={{ "--sw": swatchColor(c.swatch) } as Vars} />
            <span>{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

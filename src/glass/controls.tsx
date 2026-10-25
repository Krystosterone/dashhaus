import type { CSSProperties, ReactNode } from "react";
import { useTrack, trackPos } from "../hooks/useTrack";
import { DIAL_SWEEP, dialAngle, useDial } from "../hooks/useDial";
import { rangePosition, stepValue } from "../hooks/range";
import { IconMinus, IconPlus } from "./icons";
import "./controls.css";

/** CSS custom properties in a style prop. */
export type Vars = CSSProperties & Record<`--${string}`, string | number>;

const KNOB = 24;

/**
 * A horizontal slider. `fill` paints the accent up to the value (brightness); `spectrum` and `warmth` show the
 * range itself (hue, colour temperature), with `gradient` for warmth's stops. A hidden range input carries the
 * keyboard and the screen reader; the hit layer above it takes the pointer through useTrack, so a vertical
 * scroll that starts on it still scrolls (touch-action: pan-y).
 */
export function GlassTrack({ id, label, value, min, max, step = 1, valueText, tone, gradient, off, onChange }: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueText: string;
  tone: "fill" | "spectrum" | "warmth";
  gradient?: string;
  /** The accent means on: an off light's fill and knob stay neutral. */
  off?: boolean;
  onChange: (value: number) => void;
}) {
  const v = Math.min(max, Math.max(min, value));
  const track = useTrack<HTMLDivElement>((x, el) => {
    const next = stepValue(trackPos(x, el.getBoundingClientRect(), KNOB / 2), min, max, step);
    if (next !== v || off) onChange(next);
  });
  const style: Vars = { "--v": rangePosition(v, min, max).toFixed(4), ...(gradient ? { "--gl-track-bg": gradient } : {}) };
  return (
    <div className="gl-track" ref={track.ref} data-tone={tone} data-off={off || undefined} style={style}>
      <div className="gl-track-bar" aria-hidden="true"><div className="gl-track-fill" /></div>
      <div className="gl-track-rail" aria-hidden="true"><div className="gl-track-pos"><span className="gl-track-knob" /></div></div>
      <div className="gl-track-hit" aria-hidden="true" {...track.handlers} />
      <input
        id={id}
        className="gl-track-input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        aria-label={label}
        aria-valuetext={valueText}
        onKeyDown={track.onKeyDown}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

const R = 84;
const point = (deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: 100 + R * Math.sin(rad), y: 100 - R * Math.cos(rad) };
};
const arc = (from: number, to: number) => {
  const a = point(from), b = point(to);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
};
const FULL = arc(-DIAL_SWEEP / 2, DIAL_SWEEP / 2);

/**
 * A setpoint dial: the open-bottomed arc, the accent from its start (or from `marker`, the other end of a
 * range) to the value, and a thumb to drag. The −/+ buttons in the opening step it, and a hidden range input
 * carries the keyboard and the screen reader. `children` is the readout in the middle.
 */
export function GlassDial({ id, label, value, min, max, step, valueText, disabled, marker, onChange, children }: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueText: (value: number) => string;
  /** Off or unknown: the arc stays, the accent, thumb and buttons go. */
  disabled?: boolean;
  /** The other end of a range, drawn as a dot the accent runs to. */
  marker?: number;
  onChange: (value: number) => void;
  children: ReactNode;
}) {
  const dial = useDial<HTMLDivElement>({ value, min, max, step, disabled, onChange });
  const a = dialAngle(rangePosition(dial.shown, min, max));
  const m = marker == null ? null : dialAngle(rangePosition(marker, min, max));
  const from = m == null ? -DIAL_SWEEP / 2 : Math.min(a, m);
  const to = m == null ? a : Math.max(a, m);
  const dot = m == null ? null : point(m);
  const nudge = (dir: 1 | -1) => {
    const next = stepValue(rangePosition(value + dir * step, min, max), min, max, step);
    if (next !== value) onChange(next);
  };
  return (
    <div className="gl-dial" data-disabled={disabled || undefined} data-dragging={dial.dragging || undefined}>
      <div className="gl-dial-face" ref={dial.ref}>
        <svg className="gl-dial-svg" viewBox="0 0 200 200" aria-hidden="true">
          <path className="gl-dial-track" d={FULL} />
          {!disabled && to - from > 0.5 && <path className="gl-dial-value" d={arc(from, to)} />}
          <path className="gl-dial-ring" d={FULL} {...dial.ring} />
          {!disabled && dot && <circle className="gl-dial-marker" cx={dot.x} cy={dot.y} r="5" />}
        </svg>
        {/* The thumb rides an arm the size of the face, turned to the value: a transform, so a drag never lays out. */}
        {!disabled && (
          <div className="gl-dial-arm" style={{ "--a": `${a}deg` } as Vars}>
            <span className="gl-dial-thumb" aria-hidden="true" {...dial.thumb} />
          </div>
        )}
        <div className="gl-dial-centre">{children}</div>
      </div>
      {!disabled && (
        <>
          <button type="button" className="gl-btn gl-dial-step" data-dir="down" aria-label={`Lower ${label}`} disabled={value <= min} onClick={() => nudge(-1)}><IconMinus /></button>
          <button type="button" className="gl-btn gl-dial-step" data-dir="up" aria-label={`Raise ${label}`} disabled={value >= max} onClick={() => nudge(1)}><IconPlus /></button>
          <input
            id={id}
            className="gl-dial-input"
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            aria-label={label}
            aria-valuetext={valueText(value)}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </>
      )}
    </div>
  );
}

export interface PickOption<T extends string> { value: T; label: string }

/**
 * One choice of several, as a tile over a native select: a phone opens its own picker, and the keyboard and
 * screen reader get a real control. The icon says what it sets; the value is the current choice.
 */
export function GlassPick<T extends string>({ label, icon, value, options, onChange }: {
  label: string;
  icon: ReactNode;
  value?: T;
  options: PickOption<T>[];
  onChange: (value: T) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <label className="gl-pick" title={label}>
      <span className="gl-pick-icon">{icon}</span>
      <span className="gl-pick-value">{current?.label ?? "—"}</span>
      <select className="gl-pick-select" aria-label={label} value={value ?? ""} onChange={(e) => onChange(e.target.value as T)}>
        {current == null && <option value="" disabled>—</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** A few views of one card, as pressed pills (a light's brightness, colour and warmth). */
export function GlassSegments<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: PickOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="gl-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="gl-btn gl-seg-opt" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

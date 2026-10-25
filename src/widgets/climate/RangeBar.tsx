import { useRef } from "react";
import type { PointerEvent, ReactNode } from "react";
import type { Vars } from "../../shared/ui";
import { useTrack, trackPos } from "../../hooks/useTrack";
import { fmtTarget } from "../../domains/climate/modes";

/**
 * Heat/cool range on one bar. HA heat_cool: target_temp_low is the heat threshold,
 * target_temp_high the cool threshold, and low <= high always.
 * Left of the low handle: heats below. Right of the high handle: cools above. The zone the unit is
 * working in fills with the accent; the rest is groove. A tick marks the room temperature.
 * Each handle shows its own value.
 * At widths of 260px and up you tap or drag anywhere on the bar: the nearest handle follows. When handles
 * overlap, the first move (or tapped side) decides which one. Below 260px and in compact cards it is a button that opens details.
 */
export function RangeBar({ id, name, low, high, current, modeCue, min, max, step, onChange, onOpen }: {
  id: string; name: string; low: number; high: number; current?: number; modeCue?: ReactNode;
  min: number; max: number; step: number;
  onChange: (low: number, high: number) => void;
  onOpen?: () => void;
}) {
  const span = Math.max(step, max - min);
  const p = (v: number) => Math.min(1, Math.max(0, (v - min) / span));
  const style = { "--lo": p(low).toFixed(4), "--hi": p(high).toFixed(4), ...(current != null ? { "--cur": p(current).toFixed(4) } : {}) } as Vars;
  // Which handle the current gesture moves; null while the handles overlap and the finger hasn't picked a side.
  const which = useRef<"lo" | "hi" | null>(null);

  const apply = (w: "lo" | "hi", v: number) => {
    const lo = w === "lo" ? Math.min(v, high) : low;
    const hi = w === "hi" ? Math.max(v, low) : high;
    if (lo !== low || hi !== high) onChange(lo, hi);
  };
  const track = useTrack<HTMLDivElement>((x, el, phase, x0) => {
    // Pointer position to a snapped temperature, using the knob width so the knob centre follows the finger.
    const kn = el.querySelector<HTMLElement>(".cw-rb-k")!.getBoundingClientRect().width;
    const v = +(Math.round((min + trackPos(x, el.getBoundingClientRect(), kn / 2) * span) / step) * step).toFixed(2);
    const at = Math.min(max, Math.max(min, v));
    if (phase === "jump") {
      // Nearest handle; when they overlap, a tap moves the one on the side tapped.
      which.current = null;
      apply(low === high ? (at > low ? "hi" : "lo") : Math.abs(at - low) <= Math.abs(at - high) ? "lo" : "hi", at);
      return;
    }
    if (!which.current) {
      // First sideways move of a drag: nearest handle, or when they overlap, the direction of travel.
      const start = +(Math.round((min + trackPos(x0, el.getBoundingClientRect(), kn / 2) * span) / step) * step).toFixed(2);
      which.current = low === high ? (x > x0 ? "hi" : "lo") : Math.abs(start - low) <= Math.abs(start - high) ? "lo" : "hi";
    }
    apply(which.current, at);
  });
  const endGesture = { onPointerUp: (e: PointerEvent<HTMLDivElement>) => { track.handlers.onPointerUp(e); which.current = null; },
    onPointerCancel: (e: PointerEvent<HTMLDivElement>) => { track.handlers.onPointerCancel(e); which.current = null; } };

  return (
    <div className="cw-rb" style={style} ref={track.ref}>
      <div className="cw-rb-zone cw-rb-zone--heat" />
      <div className="cw-rb-zone cw-rb-zone--cool" />
      {current != null && <i className="cw-rb-cur" aria-hidden="true" />}
      {/* Narrow and compact: one readout. Wider standard/featured cards: values ride the handles. */}
      <span className="cw-rb-lab" aria-hidden="true"><span>{modeCue && <span className="cw-control-mode">{modeCue}</span>}{low === high ? fmtTarget(low) : `${fmtTarget(low)}–${fmtTarget(high)}`}°</span></span>
      <div className="cw-rb-rail" aria-hidden="true">
        <div className="cw-rb-at cw-rb-at--lo"><i className="cw-rb-k cw-rb-k--lo">{fmtTarget(low)}°</i></div>
        <div className="cw-rb-at cw-rb-at--hi"><i className="cw-rb-k cw-rb-k--hi">{fmtTarget(high)}°</i></div>
      </div>
      {/* Pointer: tap or drag anywhere on the bar. Keyboard and screen readers: the two sliders below. */}
      <div className="cw-rb-hit" aria-hidden="true" {...track.handlers} {...endGesture} />
      <input
        id={`${id}-lo`} className="cw-rb-in cw-rb-in--lo" type="range" min={min} max={max} step={step} value={low}
        aria-label={`${name}, heat below`} aria-valuetext={`Heat below ${fmtTarget(low)} degrees`}
        onKeyDown={track.onKeyDown} onChange={(ev) => apply("lo", Number(ev.target.value))}
      />
      <input
        id={`${id}-hi`} className="cw-rb-in cw-rb-in--hi" type="range" min={min} max={max} step={step} value={high}
        aria-label={`${name}, cool above`} aria-valuetext={`Cool above ${fmtTarget(high)} degrees`}
        onKeyDown={track.onKeyDown} onChange={(ev) => apply("hi", Number(ev.target.value))}
      />
      {onOpen && (
        <button type="button" className="cw-rb-open" onClick={onOpen}
          aria-label={`${name}: heat below ${fmtTarget(low)}°, cool above ${fmtTarget(high)}°. Open details`} />
      )}
    </div>
  );
}

const Minus = () => <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8" /></svg>;
const Plus = () => <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8M7 3v8" /></svg>;

/** Sheet only: exact half-degree steps for each threshold, keeping low <= high. */
export function RangeFine({ low, high, min, max, step, onChange }: {
  low: number; high: number; min: number; max: number; step: number;
  onChange: (low: number, high: number) => void;
}) {
  const r = (v: number) => +v.toFixed(2);
  const group = (kind: "heat" | "cool", label: string, value: number, down: number, up: number, set: (v: number) => void) => (
    <div className={`cw-fine-g cw-fine-g--${kind}`} role="group" aria-label={label}>
      <span className="cw-fine-l"><span>{label}</span><b>{fmtTarget(value)}°</b></span>
      <button type="button" className="cw-fine-b" aria-label={`${label} ${fmtTarget(down)}°`} disabled={down === value} onClick={() => set(down)}><Minus /></button>
      <button type="button" className="cw-fine-b" aria-label={`${label} ${fmtTarget(up)}°`} disabled={up === value} onClick={() => set(up)}><Plus /></button>
    </div>
  );
  return (
    <div className="cw-fine">
      {group("heat", "Heat below", low, r(Math.max(min, low - step)), r(Math.min(high, low + step)), (v) => onChange(v, high))}
      {group("cool", "Cool above", high, r(Math.max(low, high - step)), r(Math.min(max, high + step)), (v) => onChange(low, v))}
    </div>
  );
}

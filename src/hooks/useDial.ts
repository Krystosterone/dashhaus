import { useRef, useState } from "react";
import type { PointerEvent } from "react";

/** The arc's span in degrees, centred on the top: a 240° dial leaves its bottom third open. */
export const DIAL_SWEEP = 240;

const clamp01 = (f: number) => Math.min(1, Math.max(0, f));

/** 0-1 along the arc to an angle in degrees: 0 is straight up, clockwise is positive. */
export const dialAngle = (f: number, sweep = DIAL_SWEEP) => -sweep / 2 + sweep * clamp01(f);

/** A point's angle around a centre, in the same frame as dialAngle, within (-180, 180]. */
export const pointerAngle = (x: number, y: number, cx: number, cy: number) => (Math.atan2(x - cx, cy - y) * 180) / Math.PI;

/** An angle to 0-1 along the arc. A press in the open bottom goes to the nearer end. */
export function dialFraction(angle: number, sweep = DIAL_SWEEP) {
  const half = sweep / 2;
  if (angle > half) return 1;
  if (angle < -half) return 0;
  return (angle + half) / sweep;
}

/** 0-1 to a value on the step grid from `min`, inside min and max, without float residue (21.499999…). */
export function stepValue(f: number, min: number, max: number, step: number) {
  const decimals = (String(step).split(".")[1] ?? "").length;
  const v = min + Math.round((clamp01(f) * (max - min)) / step) * step;
  return +Math.min(max, Math.max(min, v)).toFixed(decimals);
}

/** A value's place along the arc, 0-1. */
export const dialPosition = (value: number, min: number, max: number) => (max > min ? clamp01((value - min) / (max - min)) : 0);

/**
 * Pointer input for a circular dial (a thermostat's setpoint).
 *
 * - The thumb drags. Only the thumb takes the touch (`touch-action: none` on it alone), so a scroll that
 *   starts anywhere else on the dial still scrolls the page.
 * - A drag shows its value as it goes (`shown`) and reports it once, on release: a thermostat should not get
 *   a command, and often beep, for every degree the finger passes.
 * - A tap or click on the ring jumps there and reports at once. A press that moves more than 8 px is not a
 *   tap, and one the browser takes for a scroll is cancelled, so scrolling across the ring changes nothing.
 * - One pointer at a time.
 *
 * `ref` goes on the element whose box is the dial, so its centre is the dial's centre.
 */
export function useDial<T extends Element>({ value, min, max, step, disabled, onChange }: {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const ref = useRef<T>(null);
  const pointer = useRef<number | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  const valueAt = (clientX: number, clientY: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return value;
    return stepValue(dialFraction(pointerAngle(clientX, clientY, r.left + r.width / 2, r.top + r.height / 2)), min, max, step);
  };

  const thumb = {
    onPointerDown: (e: PointerEvent<Element>) => {
      if (disabled || pointer.current != null || e.button > 0) return;
      pointer.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      setPreview(value);
    },
    onPointerMove: (e: PointerEvent<Element>) => {
      if (e.pointerId !== pointer.current) return;
      setPreview(valueAt(e.clientX, e.clientY));
    },
    onPointerUp: (e: PointerEvent<Element>) => {
      if (e.pointerId !== pointer.current) return;
      pointer.current = null;
      const next = valueAt(e.clientX, e.clientY);
      setPreview(null);
      if (next !== value) onChange(next);
    },
    onPointerCancel: (e: PointerEvent<Element>) => {
      if (e.pointerId !== pointer.current) return;
      pointer.current = null;
      setPreview(null);
    },
  };

  const tap = useRef<{ id: number; x: number; y: number } | null>(null);
  const ring = {
    onPointerDown: (e: PointerEvent<Element>) => {
      if (disabled || e.button > 0) return;
      tap.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: PointerEvent<Element>) => {
      const t = tap.current;
      tap.current = null;
      if (!t || t.id !== e.pointerId || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 8) return;
      const next = valueAt(e.clientX, e.clientY);
      if (next !== value) onChange(next);
    },
    onPointerCancel: () => { tap.current = null; },
  };

  return { ref, shown: preview ?? value, dragging: preview != null, thumb, ring };
}

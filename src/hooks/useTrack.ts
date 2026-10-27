import { useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

/**
 * Pointer input for a horizontal track (brightness, warmth, the heat/cool range).
 *
 * - Mouse: the value jumps on press. Touch and pen: on a tap, or on the first sideways move, so a
 *   vertical scroll that starts on the track never changes anything (the track sets touch-action: pan-y
 *   and the browser cancels the pointer when it takes the scroll).
 * - A jump animates (the root gets data-anim, which CSS uses to turn transitions on). Dragging and
 *   keyboard steps do not: the value follows the finger, and keys repeat too often to animate.
 * - One pointer at a time.
 *
 * `pick(clientX, root, phase, x0)` turns the pointer position into a value and reports it if it changed.
 */
export function useTrack<T extends HTMLElement>(pick: (clientX: number, root: T, phase: "jump" | "drag", x0: number) => void) {
  const ref = useRef<T>(null);
  const g = useRef<{ id: number; x0: number; moved: boolean; touch: boolean } | null>(null);

  const anim = (on: boolean) => {
    const el = ref.current;
    if (!el) return;
    if (on) el.setAttribute("data-anim", "");
    else el.removeAttribute("data-anim");
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (g.current || e.button > 0 || !ref.current) return;
    const touch = e.pointerType !== "mouse";
    g.current = { id: e.pointerId, x0: e.clientX, moved: false, touch };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!touch) { anim(true); pick(e.clientX, ref.current, "jump", e.clientX); }
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const s = g.current;
    if (!s || e.pointerId !== s.id || !ref.current) return;
    if (!s.moved) {
      if (Math.abs(e.clientX - s.x0) < 4) return;
      s.moved = true;
      anim(false);
    }
    pick(e.clientX, ref.current, "drag", s.x0);
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const s = g.current;
    if (!s || e.pointerId !== s.id) return;
    g.current = null;
    if (s.touch && !s.moved && ref.current) { anim(true); pick(e.clientX, ref.current, "jump", e.clientX); }
  };
  const onPointerCancel = (e: PointerEvent<HTMLElement>) => {
    if (g.current?.id === e.pointerId) g.current = null;
  };
  /** For the keyboard slider: arrow keys should not animate. */
  const onKeyDown = (_e: KeyboardEvent) => anim(false);

  return { ref, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }, onKeyDown };
}

/** Pointer x to a 0-1 position along a track whose usable length is the box minus `inset` on each side. */
export const trackPos = (clientX: number, r: DOMRect, inset: number) =>
  Math.min(1, Math.max(0, (clientX - r.left - inset) / Math.max(1, r.width - inset * 2)));

/** Keyboard value for a range whose reported endpoints may not align to its step. */
export function rangeKeyValue(event: KeyboardEvent, value: number, min: number, max: number, step: number) {
  let next: number;
  switch (event.key) {
    case "ArrowLeft":
    case "ArrowDown": next = value - step; break;
    case "ArrowRight":
    case "ArrowUp": next = value + step; break;
    case "PageDown": next = value - step * 10; break;
    case "PageUp": next = value + step * 10; break;
    case "Home": next = min; break;
    case "End": next = max; break;
    default: return undefined;
  }
  event.preventDefault();
  return Math.min(max, Math.max(min, Number(next.toFixed(4))));
}

type RangeThumb = "low" | "high";

interface OrderedRangeOptions<T extends HTMLElement> {
  low: number;
  high: number;
  min: number;
  max: number;
  step: number;
  inset: number | ((root: T) => number);
  disabled?: boolean;
  onChange: (low: number, high: number) => void;
}

/** Ordered two-thumb behavior shared by every skin; presentation supplies only its thumb inset. */
export function useOrderedRangeTrack<T extends HTMLElement>({
  low,
  high,
  min,
  max,
  step,
  inset,
  disabled,
  onChange,
}: OrderedRangeOptions<T>) {
  const lo = Math.min(max, Math.max(min, Math.min(low, high)));
  const hi = Math.min(max, Math.max(min, Math.max(low, high)));
  const span = Math.max(step, max - min);
  const active = useRef<RangeThumb | null>(null);

  const apply = (thumb: RangeThumb, value: number) => {
    if (disabled) return;
    const nextLow = thumb === "low" ? Math.min(value, hi) : lo;
    const nextHigh = thumb === "high" ? Math.max(value, lo) : hi;
    if (nextLow !== lo || nextHigh !== hi) onChange(nextLow, nextHigh);
  };
  const snap = (clientX: number, root: T) => {
    const edge = typeof inset === "function" ? inset(root) : inset;
    const offset = trackPos(clientX, root.getBoundingClientRect(), edge) * span;
    const value = min + Math.round(offset / step) * step;
    return Math.min(max, Math.max(min, Number(value.toFixed(4))));
  };
  const track = useTrack<T>((clientX, root, phase, x0) => {
    if (disabled) return;
    const at = snap(clientX, root);
    if (phase === "jump") {
      active.current = null;
      apply(lo === hi ? (at > lo ? "high" : "low") : Math.abs(at - lo) <= Math.abs(at - hi) ? "low" : "high", at);
      return;
    }
    if (!active.current) {
      const start = snap(x0, root);
      active.current = lo === hi ? (clientX > x0 ? "high" : "low") : Math.abs(start - lo) <= Math.abs(start - hi) ? "low" : "high";
    }
    apply(active.current, at);
  });
  const onKeyDown = (event: KeyboardEvent, thumb: RangeThumb) => {
    track.onKeyDown(event);
    const next = rangeKeyValue(event, thumb === "low" ? lo : hi, min, max, step);
    if (next != null) apply(thumb, next);
  };

  return {
    ...track,
    handlers: {
      ...track.handlers,
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        track.handlers.onPointerUp(event);
        active.current = null;
      },
      onPointerCancel: (event: PointerEvent<HTMLElement>) => {
        track.handlers.onPointerCancel(event);
        active.current = null;
      },
    },
    onKeyDown,
    low: lo,
    high: hi,
    span,
    apply,
  };
}

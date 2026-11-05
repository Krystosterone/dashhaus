import { useRef } from "react";
import type { ChangeEvent, KeyboardEvent, PointerEvent } from "react";

/** A sideways move past this, in px, makes a press a drag. */
const DRAG_SLOP = 4;

/** Pointer x to a 0-1 position along a track whose usable length is the box minus `inset` on each side. */
export const trackPos = (clientX: number, r: DOMRect, inset: number) =>
  Math.min(1, Math.max(0, (clientX - r.left - inset) / Math.max(1, r.width - inset * 2)));

/** Keyboard value for a range whose reported endpoints may not align to its step: steps go from the value. */
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
  return clamp(Number(next.toFixed(4)), min, max);
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const onGrid = (x: number, step: number) => Math.abs(x / step - Math.round(x / step)) < 1e-6;

/** The thumb's half width in px, fixed or measured from the drawn track. */
type Inset<T> = number | ((root: T) => number);

/**
 * The pointer gesture every track shares.
 *
 * - Mouse: the value jumps on press. Touch and pen: on a tap, or on the first sideways move, so a vertical scroll
 *   that starts on the track never changes anything (the hit layer sets touch-action: pan-y and the browser
 *   cancels the pointer when it takes the scroll).
 * - A jump animates (the root gets `data-anim`, which CSS uses to turn transitions on). Dragging and keyboard
 *   steps do not: the value follows the finger, and keys repeat too often to animate.
 * - One pointer at a time.
 */
function useTrackGesture<T extends HTMLElement>(pick: (clientX: number, root: T, phase: "jump" | "drag", x0: number) => void, onEnd?: () => void) {
  const ref = useRef<T>(null);
  const g = useRef<{ id: number; x0: number; moved: boolean; touch: boolean } | null>(null);

  const anim = (on: boolean) => {
    const el = ref.current;
    if (!el) return;
    if (on) el.setAttribute("data-anim", "");
    else el.removeAttribute("data-anim");
  };

  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (g.current || e.button > 0 || !ref.current) return;
      const touch = e.pointerType !== "mouse";
      g.current = { id: e.pointerId, x0: e.clientX, moved: false, touch };
      e.currentTarget.setPointerCapture(e.pointerId);
      if (!touch) { anim(true); pick(e.clientX, ref.current, "jump", e.clientX); }
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = g.current;
      if (!s || e.pointerId !== s.id || !ref.current) return;
      if (!s.moved) {
        if (Math.abs(e.clientX - s.x0) < DRAG_SLOP) return;
        s.moved = true;
        anim(false);
      }
      pick(e.clientX, ref.current, "drag", s.x0);
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const s = g.current;
      if (!s || e.pointerId !== s.id) return;
      g.current = null;
      if (s.touch && !s.moved && ref.current) { anim(true); pick(e.clientX, ref.current, "jump", e.clientX); }
      onEnd?.();
    },
    onPointerCancel: (e: PointerEvent<HTMLElement>) => {
      if (g.current?.id !== e.pointerId) return;
      g.current = null;
      onEnd?.();
    },
  };

  return { ref, handlers, still: () => anim(false) };
}

/**
 * The native range input that carries keyboard and screen readers under a track's hit layer. Keys step from the
 * current value, so a range whose reported ends don't divide by its step keeps both ends. The input keeps its
 * native step while the ends and the value sit on the step's grid, so assistive tech steps it too; off the grid
 * it takes `step="any"`, or the browser would round the value it shows.
 */
function rangeInput(value: number, valueText: string, min: number, max: number, step: number, disabled: boolean | undefined, still: () => void, set: (v: number) => void) {
  return {
    type: "range" as const,
    min,
    max: Math.max(max, min + step),
    step: [min, max, value].every((x) => onGrid(x, step)) ? step : ("any" as const),
    value,
    "aria-valuetext": valueText,
    disabled,
    onKeyDown: (event: KeyboardEvent) => {
      still();
      const next = rangeKeyValue(event, value, min, max, step);
      if (next != null && next !== value) set(next);
    },
    onChange: (event: ChangeEvent<HTMLInputElement>) => set(clamp(Number(event.target.value), min, max)),
  };
}

export interface SliderOptions<T extends HTMLElement> {
  /** The value the track shows. */
  value: number;
  /** The low end. */
  min: number;
  /** The high end. */
  max: number;
  /** The step a pointer snaps to, counted from min. */
  step?: number;
  /** The thumb's half width: the track's usable length is its box less this on each side. */
  inset: Inset<T>;
  /** No input at all. */
  disabled?: boolean;
  /** Where a pointer x lies along the track, 0-1. Default: left to right over the box less `inset` each side. */
  along?: (clientX: number, rect: DOMRect, inset: number) => number;
  /** A pointer value onto the grid. Default: the nearest step counted from `min`. The result is kept in range. */
  snap?: (raw: number) => number;
  /** A tap where the thumb already sits still reports, e.g. so a light that's off turns on at its level. */
  reportUnchanged?: boolean;
  /** What the value means, read out for it ("Off. Last set to 40 percent"). */
  valueText: (value: number) => string;
  /** Called with each new value. */
  onChange: (value: number) => void;
}

/**
 * A one-value slider's behaviour, for any skin to draw. Spread `rootProps` on the track's box (it gets
 * `data-anim` while a jump animates), `hitProps` on a layer over it that takes the pointer (tap anywhere, or
 * drag; it leaves vertical swipes to the page), and `inputProps` on a visually hidden `<input>`, which carries the
 * keyboard and screen readers: give it its id and label. `fraction(v)` places a value along the track, 0-1.
 */
export function useSlider<T extends HTMLElement>({ value, min, max, step = 1, inset, disabled, along = trackPos, snap, reportUnchanged, valueText, onChange }: SliderOptions<T>) {
  const v = clamp(value, min, max);
  const span = Math.max(step, max - min);
  const gesture = useTrackGesture<T>((clientX, root) => {
    const raw = min + along(clientX, root.getBoundingClientRect(), typeof inset === "function" ? inset(root) : inset) * span;
    const next = clamp(snap ? snap(raw) : Number((min + Math.round((raw - min) / step) * step).toFixed(4)), min, max);
    if (next !== v || reportUnchanged) onChange(next);
  });

  return {
    value: v,
    fraction: (x: number) => clamp((x - min) / span, 0, 1),
    rootProps: { ref: gesture.ref },
    hitProps: { "aria-hidden": true, ...(disabled ? {} : gesture.handlers) },
    inputProps: rangeInput(v, valueText(v), min, max, step, disabled, gesture.still, (next) => { if (!disabled) onChange(next); }),
  };
}

type RangeThumb = "low" | "high";

export interface RangeSliderOptions<T extends HTMLElement> {
  low: number;
  high: number;
  min: number;
  max: number;
  step: number;
  inset: Inset<T>;
  disabled?: boolean;
  /** What each thumb's value means, read out for it ("Heat below 20 degrees"). */
  valueText: (value: number, thumb: RangeThumb) => string;
  onChange: (low: number, high: number) => void;
}

/**
 * Two ordered values on one track (a heat/cool range), low <= high always, drawn by any skin. A tap moves the
 * nearer thumb; a drag moves the thumb nearer where it began, and when the thumbs overlap the tap's side or the
 * drag's first direction picks one. Spread `rootProps`, `hitProps` as for `useSlider`, and `lowInputProps` and
 * `highInputProps` on two hidden range inputs.
 */
export function useRangeSlider<T extends HTMLElement>({ low, high, min, max, step, inset, disabled, valueText, onChange }: RangeSliderOptions<T>) {
  const lo = clamp(Math.min(low, high), min, max);
  const hi = clamp(Math.max(low, high), min, max);
  const span = Math.max(step, max - min);
  const active = useRef<RangeThumb | null>(null);

  const apply = (thumb: RangeThumb, value: number) => {
    if (disabled) return;
    const nextLow = thumb === "low" ? Math.min(value, hi) : lo;
    const nextHigh = thumb === "high" ? Math.max(value, lo) : hi;
    if (nextLow !== lo || nextHigh !== hi) onChange(nextLow, nextHigh);
  };
  const snapAt = (clientX: number, root: T) => {
    const edge = typeof inset === "function" ? inset(root) : inset;
    const offset = trackPos(clientX, root.getBoundingClientRect(), edge) * span;
    return clamp(Number((min + Math.round(offset / step) * step).toFixed(4)), min, max);
  };
  const nearer = (at: number, tie: boolean): RangeThumb =>
    lo === hi ? (tie ? "high" : "low") : Math.abs(at - lo) <= Math.abs(at - hi) ? "low" : "high";

  const gesture = useTrackGesture<T>((clientX, root, phase, x0) => {
    const at = snapAt(clientX, root);
    if (phase === "jump") {
      active.current = null;
      apply(nearer(at, at > lo), at);
      return;
    }
    active.current ??= nearer(snapAt(x0, root), clientX > x0);
    apply(active.current, at);
  }, () => { active.current = null; });

  return {
    low: lo,
    high: hi,
    fraction: (x: number) => clamp((x - min) / span, 0, 1),
    rootProps: { ref: gesture.ref },
    hitProps: { "aria-hidden": true, ...(disabled ? {} : gesture.handlers) },
    lowInputProps: rangeInput(lo, valueText(lo, "low"), min, max, step, disabled, gesture.still, (v) => apply("low", v)),
    highInputProps: rangeInput(hi, valueText(hi, "high"), min, max, step, disabled, gesture.still, (v) => apply("high", v)),
  };
}

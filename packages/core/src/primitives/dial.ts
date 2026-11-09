import { useState } from "react";
import type { ChangeEvent, PointerEvent } from "react";

/** Where a value sits on a dial: its top, and the range it may take round it. */
export interface DialRange {
  /** The value at the top of the dial. Values grow clockwise from it. */
  top: number;
  min: number;
  max: number;
}

/**
 * The value under a point on a dial, from its offset from the dial's centre (screen pixels, y down): its angle
 * clockwise from the top, added to the value at the top, to a whole unit. A range short of a whole turn leaves a gap;
 * a point in it takes the nearer end, so a drag across the gap never jumps round the long way.
 */
export function dialValue(dx: number, dy: number, { top, min, max }: DialRange): number {
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  let value = top + deg;
  while (value < min) value += 360;
  while (value >= min + 360) value -= 360;
  if (value > max) value = value - max <= min + 360 - value ? max : min;
  return Math.round(value);
}

export interface DialOptions extends DialRange {
  value: number;
  /** The keyboard's step. Default 1. */
  step?: number;
  disabled?: boolean;
  /** What a screen reader hears for a value. */
  valueText?: (value: number) => string;
  /** A drag's value once let go, or a key's at each press: never every move, so a device isn't sent each one. */
  onChange: (value: number) => void;
}

/**
 * A dial you turn: a value round a circle, as a fan's aim is. A press or a drag anywhere on the root turns it to the
 * point under the finger (`dialValue`); the dial follows as `shown` while held, and `onChange` hears the value once,
 * when let go, if it moved. A hidden native range input (`inputProps`) takes the keyboard and the screen reader, each
 * key step sent at once. The root is turned in two dimensions, so the skin gives it `touch-action: none`: a page never
 * scrolls from a dial. One pointer at a time.
 */
export function useDial<T extends Element>({ value, top, min, max, step = 1, disabled, valueText, onChange }: DialOptions) {
  const [held, setHeld] = useState<{ id: number; value: number } | null>(null);
  const at = (event: PointerEvent<T>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return dialValue(event.clientX - (box.left + box.width / 2), event.clientY - (box.top + box.height / 2), { top, min, max });
  };
  const shown = held?.value ?? value;
  return {
    /** The value to draw: the finger's while a drag is held, else `value`. */
    shown,
    dragging: held != null,
    rootProps: {
      "data-dragging": held ? "" : undefined,
      onPointerDown: (event: PointerEvent<T>) => {
        if (disabled || held || event.button > 0) return;
        (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
        setHeld({ id: event.pointerId, value: at(event) });
      },
      onPointerMove: (event: PointerEvent<T>) => {
        if (held && event.pointerId === held.id) setHeld({ id: held.id, value: at(event) });
      },
      onPointerUp: (event: PointerEvent<T>) => {
        if (!held || event.pointerId !== held.id) return;
        setHeld(null);
        if (held.value !== value) onChange(held.value);
      },
      onPointerCancel: () => setHeld(null),
    },
    inputProps: {
      type: "range" as const,
      min,
      max,
      step,
      value: shown,
      disabled,
      "aria-valuetext": valueText?.(shown),
      onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.valueAsNumber),
    },
  };
}

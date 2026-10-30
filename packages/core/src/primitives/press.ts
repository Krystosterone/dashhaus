import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";

/** How long a press must be held, in ms. */
const HOLD_MS = 450;
/** A hold ends if the pointer travels further than this, in px: it's a scroll or a drag. */
const HOLD_SLOP = 10;
/** The click that ends a hold usually never arrives (the sheet opens under the finger), so the guard lapses. */
const GUARD_MS = 1000;

export interface PressOptions {
  onPress: () => void;
  /** Press and hold. The click that ends the hold doesn't also press. */
  onHold?: () => void;
  /** A latching control's state, announced as pressed. Leave it out for a button that acts once. */
  pressed?: boolean;
  /** Out of reach: native `disabled`, so no tap, hold or focus. */
  disabled?: boolean;
  /** The entity can't act: it stays focusable and says so (`aria-disabled`); a tap does nothing, a hold still works. */
  unavailable?: boolean;
}

/**
 * A button's behaviour, for any skin to draw: tap to press, optionally hold, optionally latch. Spread the result
 * onto a `<button>`. A hold fires after 450 ms unless the pointer moves more than 10 px, buzzes where the device
 * can, sets `data-holding` while it builds, and swallows the click that ends it. The context menu a long touch
 * would open is suppressed while a hold is wired.
 */
export function usePress({ onPress, onHold, pressed, disabled, unavailable }: PressOptions) {
  const hold = disabled ? undefined : onHold;
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(0);
  const start = useRef({ x: 0, y: 0 });
  const [holding, setHolding] = useState(false);

  const cancel = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
  }, []);
  useEffect(() => cancel, [cancel]);

  const onPointerDown = (e: PointerEvent) => {
    if (!hold || e.button > 0) return;
    fired.current = 0;
    start.current = { x: e.clientX, y: e.clientY };
    setHolding(true);
    timer.current = window.setTimeout(() => {
      fired.current = Date.now();
      setHolding(false);
      try { navigator.vibrate?.(8); } catch { /* not supported */ }
      hold();
    }, HOLD_MS);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (timer.current !== undefined && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > HOLD_SLOP) cancel();
  };
  // The click that ends a hold follows the release, however long the hold was: time the guard from there.
  const onPointerUp = () => {
    if (fired.current) fired.current = Date.now();
    cancel();
  };

  return {
    type: "button" as const,
    "aria-pressed": pressed,
    "aria-disabled": unavailable || undefined,
    disabled,
    "data-holding": holding || undefined,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: MouseEvent) => { if (hold) e.preventDefault(); },
    onClick: () => {
      const held = fired.current > 0 && Date.now() - fired.current < GUARD_MS;
      fired.current = 0;
      if (!held && !unavailable) onPress();
    },
  };
}

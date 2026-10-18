import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent, MouseEvent } from "react";

/**
 * Press and hold to trigger `onLongPress`. Moving more than 10px cancels.
 * Call `consumeLongPress()` in the element's click handler: it returns true once
 * after a long press so the click that ends it does not also toggle the light.
 * That click often never arrives (the sheet opens under the finger and takes it), so the
 * flag expires after a moment instead of swallowing the next real press.
 */
export function useLongPress(onLongPress?: () => void, ms = 450) {
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
    if (!onLongPress || e.button > 0) return;
    fired.current = 0;
    start.current = { x: e.clientX, y: e.clientY };
    setHolding(true);
    timer.current = window.setTimeout(() => {
      fired.current = Date.now();
      setHolding(false);
      try { navigator.vibrate?.(8); } catch { /* not supported */ }
      onLongPress();
    }, ms);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (timer.current !== undefined && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel();
  };
  const onContextMenu = (e: MouseEvent) => { if (onLongPress) e.preventDefault(); };

  // The click that ends a long press follows the release, however long the hold was: time the guard from there.
  const onPointerUp = () => {
    if (fired.current) fired.current = Date.now();
    cancel();
  };

  const consumeLongPress = () => {
    const f = fired.current;
    fired.current = 0;
    return f > 0 && Date.now() - f < 1000;
  };

  return {
    holding,
    consumeLongPress,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: cancel, onPointerLeave: cancel, onContextMenu },
  };
}

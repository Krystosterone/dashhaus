import { useEffect, useState } from "react";

/**
 * Seconds left in an alarm's exit or entry delay, ticking each second: `delay` is the delay's length in seconds,
 * `since` when it started (ms since the epoch). A tab woken from the background catches up at once. Undefined while
 * not `active`, or with no way to know (no length, or no start).
 */
export function useDelayLeft(delay: number | undefined, since: number | undefined, active: boolean): number | undefined {
  const timed = active && delay != null && delay > 0 && since != null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timed) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    const wake = () => setNow(Date.now());
    document.addEventListener("visibilitychange", wake);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", wake); };
  }, [timed, since]);
  if (!timed) return undefined;
  return Math.max(0, Math.ceil(delay - (now - since) / 1000));
}

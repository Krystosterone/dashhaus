import { useEffect, useState } from "react";

/**
 * The current time, updated on each minute boundary (not every 60s from mount, which drifts).
 * Background tabs throttle timers and a wall tablet may sleep, so when the page becomes visible
 * again the clock catches up at once. Pass `fixed` to freeze it (stories, screenshots, tests).
 */
export function useNow(fixed?: Date): Date {
  const [now, setNow] = useState(() => fixed ?? new Date());
  const pinned = fixed?.getTime();
  useEffect(() => {
    if (pinned != null) return;
    let t: number | undefined;
    const tick = () => {
      const d = new Date();
      setNow(d);
      t = window.setTimeout(tick, 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 20);
    };
    tick();
    const onVisible = () => { if (document.visibilityState === "visible") { window.clearTimeout(t); tick(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearTimeout(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [pinned]);
  return pinned != null ? new Date(pinned) : now;
}

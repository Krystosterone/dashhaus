import { useCallback, useEffect, useRef } from "react";

/** How long a confirmation waits before it takes a press, in ms: longer than a double tap. */
export const SETTLE_MS = 400;

/**
 * Whether a control that just appeared has been on screen long enough to take a press. A confirmation that opens
 * under the finger (a lock's Unlock, after a tap that asked for it) must not take the second tap of a double tap,
 * or a stray tap would still unlock. Call the returned function in the handler and ignore the press while it says
 * false. It draws nothing, so the control never flickers; the clock starts when the component mounts.
 */
export function useSettled(ms: number = SETTLE_MS): () => boolean {
  const since = useRef<number | null>(null);
  useEffect(() => { since.current = Date.now(); }, []);
  return useCallback(() => since.current != null && Date.now() - since.current >= ms, [ms]);
}

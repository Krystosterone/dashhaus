import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/** How far down the viewport a section's top must pass to count as the one being read. */
const READING_LINE = 0.35;
/** After a jump, the smooth scroll passes other sections; they don't take over until it has settled. */
const JUMP_SETTLE_MS = 800;

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Which section of a page is being read, for a nav that marks it, and a way to jump to one. Sections are the
 * elements under `rootRef` with a `data-section-id`; the one in view is the last whose top has passed a line a
 * third of the way down the viewport, or the last section once the page is scrolled to its end.
 *
 * It listens for scrolls on the whole document (in the capture phase), so it follows the page whichever ancestor
 * scrolls it: the window in Storybook, Home Assistant's view inside the frontend, through shadow roots. `key`
 * re-reads the sections when the page's content changes.
 */
export function useScrollSpy<T extends HTMLElement>(rootRef: RefObject<T>, key?: unknown) {
  const [active, setActive] = useState<string | null>(null);
  const lockUntil = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (performance.now() < lockUntil.current) return;
      const sections = [...root.querySelectorAll<HTMLElement>("[data-section-id]")];
      if (!sections.length) { setActive(null); return; }
      const line = innerHeight * READING_LINE;
      let current = sections[0];
      for (const s of sections) if (s.getBoundingClientRect().top <= line) current = s;
      const box = root.getBoundingClientRect();
      if (box.top < 0 && box.bottom <= innerHeight + 2) current = sections[sections.length - 1];
      setActive(current.dataset.sectionId ?? null);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    addEventListener("resize", schedule);
    measure();
    return () => {
      document.removeEventListener("scroll", schedule, { capture: true });
      removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [rootRef, key]);

  /** Scroll a section to the top (smoothly, unless motion is reduced) and mark it at once. */
  const jump = useCallback((id: string) => {
    const target = rootRef.current?.querySelector<HTMLElement>(`[data-section-id="${id}"]`);
    if (!target) return;
    setActive(id);
    lockUntil.current = performance.now() + JUMP_SETTLE_MS;
    target.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
  }, [rootRef]);

  return [active, jump] as const;
}

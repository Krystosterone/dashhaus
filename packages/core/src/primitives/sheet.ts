import { useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent, SyntheticEvent } from "react";

/** px per ms over the last 100 ms of a drag. Vaul's threshold: a flick is enough. */
const FLICK = 0.4;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface SheetOptions {
  open: boolean;
  /** The dialog's accessible name, e.g. "Kitchen details". */
  label: string;
  onClose: () => void;
  /** The skin's longest exit transition plus a frame, in ms: how long `data-closing` stays before the dialog closes. */
  closeMs: number;
  /** Where the sheet sits at the bottom of the screen and can be dragged down, e.g. "(max-width: 600px)". */
  phone: string;
  /** A selector for the part that drags the sheet (its header); buttons and inputs inside it don't. */
  handle: string;
  /** The transition a short drag snaps back with, e.g. "translate 300ms var(--ease-drawer)". */
  snapBack: string;
}

/**
 * A modal sheet's behaviour, for any skin to draw: a `<dialog>` that mounts its content when opened, shows as a
 * modal, locks the page's scroll, and on close sets `data-closing` for the skin's exit transition before it
 * closes and unmounts. Escape and a backdrop click close it. On phones the handle drags it down: past 30% of
 * its height (140 px at most) or any flick dismisses it, a short slow drag snaps back, and dragging up meets
 * growing friction. One pointer at a time. Spread `dialogProps` on a `<dialog>` and render the content only while
 * `mounted`; `[data-autofocus]` inside takes focus on open.
 *
 * It stays a native modal `<dialog>`, never a portalled one: the platform puts it in the top layer and makes the
 * page behind inert, and that holds inside the Lovelace card's shadow root (research/08-interaction-primitives.md).
 */
export function useSheet({ open, label, onClose, closeMs, phone, handle, snapBack }: SheetOptions) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(open);
  const drag = useRef<{ id: number; y0: number; dy: number; trail: { t: number; y: number }[] } | null>(null);
  if (open && !mounted) setMounted(true);

  // Show once the content is in the DOM; lock page scroll while open.
  useEffect(() => {
    const d = ref.current;
    if (!d || !open || !mounted) return;
    d.removeAttribute("data-closing");
    d.style.translate = "";
    d.style.transition = "";
    if (!d.open) {
      try { d.showModal(); } catch { d.setAttribute("open", ""); }
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = prev; };
  }, [open, mounted]);

  // Animate out, then close and unmount.
  useEffect(() => {
    const d = ref.current;
    if (open || !d) return;
    if (!d.open) { setMounted(false); return; }
    const finish = () => {
      d.removeAttribute("data-closing");
      d.style.translate = "";
      d.style.transition = "";
      if (d.open) d.close();
      setMounted(false);
    };
    d.setAttribute("data-closing", "");
    const t = window.setTimeout(finish, closeMs);
    return () => window.clearTimeout(t);
  }, [open, closeMs]);

  const onPointerDown = (e: PointerEvent<HTMLDialogElement>) => {
    // One finger at a time: a second touch mid-drag would make the sheet jump to it.
    if (drag.current) return;
    const t = e.target as Element;
    if (e.button > 0 || !window.matchMedia(phone).matches) return;
    // A sheet opened from inside this one handles its own drags.
    if (t.closest("dialog") !== e.currentTarget) return;
    if (!t.closest(handle) || t.closest("button, a, input")) return;
    drag.current = { id: e.pointerId, y0: e.clientY, dy: 0, trail: [{ t: e.timeStamp, y: e.clientY }] };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.transition = "none";
  };
  const onPointerMove = (e: PointerEvent<HTMLDialogElement>) => {
    const g = drag.current;
    if (!g || e.pointerId !== g.id) return;
    g.dy = e.clientY - g.y0;
    g.trail.push({ t: e.timeStamp, y: e.clientY });
    while (g.trail.length > 2 && e.timeStamp - g.trail[0].t > 100) g.trail.shift();
    // Down follows the finger 1:1. Up is past the resting edge, so it gives a little, less the further you pull.
    const y = g.dy >= 0 ? g.dy : -3 * Math.sqrt(-g.dy);
    e.currentTarget.style.translate = `0 ${y.toFixed(1)}px`;
  };
  const endDrag = (e: PointerEvent<HTMLDialogElement>) => {
    const g = drag.current;
    if (!g || e.pointerId !== g.id) return;
    drag.current = null;
    const d = e.currentTarget;
    const a = g.trail[0], b = g.trail[g.trail.length - 1];
    const velocity = (b.y - a.y) / Math.max(1, b.t - a.t);
    d.style.transition = "";
    if (g.dy > Math.min(140, d.offsetHeight * 0.3) || (g.dy > 12 && velocity > FLICK)) {
      // Hand over to the closing transition from where the finger left it.
      if (!reducedMotion()) d.style.translate = "";
      d.setAttribute("data-closing", "");
      onClose();
    } else {
      d.style.transition = snapBack;
      d.style.translate = "0 0";
      window.setTimeout(() => { if (!drag.current) { d.style.transition = ""; d.style.translate = ""; } }, 320);
    }
  };

  const dialogProps = {
    ref,
    "aria-label": label,
    onCancel: (e: SyntheticEvent<HTMLDialogElement>) => {
      // Escape belongs to the top sheet only, not to a sheet it was opened from.
      if (e.target !== e.currentTarget) return;
      e.preventDefault();
      onClose();
    },
    onClick: (e: MouseEvent<HTMLDialogElement>) => {
      // Only a click on the backdrop closes: the dialog itself receives the click that ends a drag.
      const d = ref.current;
      if (!d || e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
    },
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };

  return { mounted, dialogProps };
}

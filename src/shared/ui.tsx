import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useLongPress } from "./useLongPress";
import "./card.css";

/** CSS custom properties in a style prop. */
export type Vars = CSSProperties & Record<`--${string}`, string | number>;

/* ---------- Colour ----------
   One accent hue (tokens.css --brand-c/--brand-h) means on: solid for energy, soft for on-but-not-energy.
   Neutrals for the rest.
   A widget's own colour is the "colour slot": it is painted on the orb and nowhere else. */

/** A colour for the orb, as OKLCH chroma and hue (lightness comes from the theme). */
export interface SlotColor { c: number; h: number }
/** Named colours for the slot. Use sparingly: one per widget, and only where it means something. */
export const COLORS = {
  yellow: { c: 0.145, h: 92 },
  apricot: { c: 0.13, h: 52 },
  rose: { c: 0.1, h: 15 },
  lavender: { c: 0.07, h: 290 },
  blue: { c: 0.09, h: 235 },
  teal: { c: 0.07, h: 200 },
  sage: { c: 0.08, h: 150 },
} satisfies Record<string, SlotColor>;
export type ColorName = keyof typeof COLORS;
/** A widget's `color` prop: a named colour, an explicit one, or "none" to keep the orb neutral. */
export type ColorProp = ColorName | SlotColor | "none";

/** Dashboard footprint. Every step uses one 60px unit; adjacent units are separated by the shared 8px gap. */
export type WidgetFootprint = "compact" | "standard" | "featured";

export type Role = "energy" | "state" | "reading";

/**
 * The colour attributes for a widget's article: its role, its glow, and its colour slot.
 * `own` is what the widget would show by default (a lamp's colour, heat or cool); `prop` overrides it.
 */
export function paint(role: Role, glow: number, own?: SlotColor | null, prop?: ColorProp) {
  const c = prop === "none" ? null : typeof prop === "string" ? COLORS[prop] : prop ?? own ?? null;
  return {
    "data-role": role,
    "data-color": c ? "" : undefined,
    "data-glow": glow > 0 ? "" : undefined,
    style: { "--hd-glow": +glow.toFixed(3), ...(c ? { "--color-c": c.c, "--color-h": c.h } : {}) } as Vars,
  };
}

/** One sample per hour: 0 = nothing, 0-1 = intensity, "unavailable", or null for hours still ahead. */
export type HourSample = number | "unavailable" | null;

export const IconOpen = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11l6-6M6 5h5v5" /></svg>;
export const IconClose = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" /></svg>;

/* ---------- Orb: the round main toggle. Tap toggles, press and hold opens details. ---------- */
export interface OrbProps {
  label: string;
  pressed: boolean;
  unavailable?: boolean;
  /** 0-1, scales the bloom around the orb. */
  intensity?: number;
  small?: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
  children: ReactNode;
}
export function Orb({ label, pressed, unavailable, intensity = 1, small, onToggle, onLongPress, children }: OrbProps) {
  const lp = useLongPress(onLongPress);
  return (
    <button
      type="button"
      className={`hd-orb${small ? " hd-orb--sm" : ""}`}
      aria-label={label}
      aria-pressed={pressed}
      aria-disabled={unavailable || undefined}
      data-holding={lp.holding || undefined}
      style={{ "--b": intensity } as Vars}
      {...lp.handlers}
      onClick={() => {
        if (lp.consumeLongPress()) return;
        if (!unavailable) onToggle();
      }}
    >
      <span className="hd-orb-i">{children}</span>
    </button>
  );
}

export function CircleButton({ label, onClick, autoFocus, children }: { label: string; onClick?: () => void; autoFocus?: boolean; children: ReactNode }) {
  return (
    <button type="button" className="hd-circ" aria-label={label} onClick={onClick} data-autofocus={autoFocus || undefined}>
      <span className="hd-circ-i">{children}</span>
    </button>
  );
}

function AlertCue({ label }: { label: string }) {
  return (
    <span className="hd-alert-cue" role="img" aria-label={label}>
      <svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" /><path d="M7 3.8v4.1M7 10.3h.01" /></svg>
    </span>
  );
}

export function AlertStatus({ label, children }: { label: string; children: ReactNode }) {
  return <><AlertCue label={label} /><span className="hd-warn">{children}</span></>;
}

/** Full-width pill that toggles. Hatched when off, filled with the tone when on. */
export function TogglePill({ label, on, onToggle, children, extra }: { label: string; on: boolean; onToggle: () => void; children: ReactNode; extra?: ReactNode }) {
  return (
    <button type="button" className="hd-pill" aria-label={label} aria-pressed={on} onClick={onToggle}>
      <span>{children}</span>
      {extra && <span className="hd-pill-x">{extra}</span>}
    </button>
  );
}

export function UnavailableSlot({ lastSeen }: { lastSeen?: string }) {
  return (
    <div className="hd-unav">
      <span>Unavailable</span>
      {lastSeen && <span className="hd-unav-t">Last seen {lastSeen}</span>}
    </div>
  );
}

/* ---------- Today strip ---------- */
/** `forecastFrom`: hours from this index on are forecasts, drawn as lighter sticks. */
export function TodayStrip({ samples, currentHour, summary, title = "Today", tone, forecastFrom }: { samples: HourSample[]; currentHour: number; summary: string; title?: string; tone?: string; forecastFrom?: number }) {
  return (
    <div className="hd-tl" style={tone ? ({ "--accent-strong": tone } as Vars) : undefined}>
      <p className="hd-tl-h"><span>{title}</span><span className="hd-tl-v">{summary}</span></p>
      <div className="hd-tl-bars" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => {
          const x = samples[i];
          let s: string;
          let h = 0;
          if (x === "unavailable") s = "unav";
          else if (x === null || x === undefined) s = "future";
          else if (forecastFrom != null && i >= forecastFrom) { s = "fc"; h = x; }
          else if (i === currentHour) { s = x > 0 ? "now" : "now-off"; h = x; }
          else if (x > 0) { s = "on"; h = x; }
          else s = "off";
          return <i key={i} data-s={s} style={{ "--h": h.toFixed(2) } as Vars} />;
        })}
      </div>
      <div className="hd-tl-axis" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span></div>
    </div>
  );
}

/** Minutes as "54m", "3h", "11h 54m". Callers handle 0 with their own words ("Not on today"). */
export const fmtDuration = (m: number) => {
  const mins = Math.max(0, Math.round(m));
  const h = Math.floor(mins / 60), r = mins % 60;
  return h === 0 ? `${r}m` : r === 0 ? `${h}h` : `${h}h ${r}m`;
};
/** One decimal, never "-0.0": a reading of -0.04 shows as 0.0. */
export const fmt1 = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return (r === 0 ? 0 : r).toFixed(1);
};

/* ---------- Choice chips: one of several, the selected one in the soft accent ---------- */
export interface ChoiceOption<T extends string | number> { value: T; label: string; sub?: string }
export function ChoiceChips<T extends string | number>({ id, label, options, value, onChange }: { id: string; label: string; options: ChoiceOption<T>[]; value: T | null | undefined; onChange: (v: T) => void }) {
  return (
    <div className="hd-blk">
      <p className="hd-blk-h"><span id={id}>{label}</span></p>
      <div className="hd-chips" role="group" aria-labelledby={id} style={{ "--n": options.length } as Vars}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" className="hd-chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            <span>{o.label}</span>
            {o.sub && <small>{o.sub}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Sheet: modal dialog ----------
   Phones (600px and under): a bottom sheet that slides up, with a grab handle and a pinned header.
   Drag the header down to dismiss: past 30% of its height (140px at most), or any flick. A short, slow drag
   snaps back. Dragging up meets growing friction instead of a wall. Wider screens: a centered panel.
   Close, the backdrop and Escape all animate it out; the motion is CSS transitions, so it can reverse mid-way.
   The page behind does not scroll while it is open. */
const PHONE = "(max-width: 600px)";
/** Longest exit transition in card.css, plus a frame. */
const CLOSE_MS = 250;
/** px per ms over the last 100ms of the drag. Vaul's threshold: a flick is enough. */
const FLICK = 0.4;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * What a sheet shows under its widget, set by whoever renders the tile. A bundle's lead uses it to list
 * the bundle's other members in its sheet. Sheets inside that list get none, so it never nests.
 */
export const SheetExtra = createContext<{ title: string; content: ReactNode } | null>(null);

export function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const extra = useContext(SheetExtra);
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
    const t = window.setTimeout(finish, CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDialogElement>) => {
    // One finger at a time: a second touch mid-drag would make the sheet jump to it.
    if (drag.current) return;
    const t = e.target as Element;
    if (e.button > 0 || !window.matchMedia(PHONE).matches) return;
    // A sheet opened from inside this one (a bundle row's) handles its own drags.
    if (t.closest("dialog") !== e.currentTarget) return;
    if (!t.closest(".hd--sheet > .hd-head") || t.closest("button, a, input")) return;
    drag.current = { id: e.pointerId, y0: e.clientY, dy: 0, trail: [{ t: e.timeStamp, y: e.clientY }] };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.transition = "none";
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDialogElement>) => {
    const g = drag.current;
    if (!g || e.pointerId !== g.id) return;
    g.dy = e.clientY - g.y0;
    g.trail.push({ t: e.timeStamp, y: e.clientY });
    while (g.trail.length > 2 && e.timeStamp - g.trail[0].t > 100) g.trail.shift();
    // Down follows the finger 1:1. Up is past the resting edge, so it gives a little, less the further you pull.
    const y = g.dy >= 0 ? g.dy : -3 * Math.sqrt(-g.dy);
    e.currentTarget.style.translate = `0 ${y.toFixed(1)}px`;
  };
  const endDrag = (e: ReactPointerEvent<HTMLDialogElement>) => {
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
      d.style.transition = "translate 300ms var(--ease-drawer)";
      d.style.translate = "0 0";
      window.setTimeout(() => { if (!drag.current) { d.style.transition = ""; d.style.translate = ""; } }, 320);
    }
  };

  return (
    // The click only closes on backdrop; Escape is the keyboard path (onCancel below).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className="hd-sheet"
      aria-label={label}
      onCancel={(e) => {
        // Escape belongs to the top sheet only, not to a sheet it was opened from.
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Only a click on the backdrop closes: the dialog itself receives the click that ends a drag.
        const d = ref.current;
        if (!d || e.target !== d) return;
        const r = d.getBoundingClientRect();
        const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        if (outside) onClose();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {mounted && (
        <div className={`hd-c${extra ? " hd-c--more" : ""}`}>
          {children}
          {extra && (
            <SheetExtra.Provider value={null}>
              <section className="hd-more" aria-label={extra.title}>
                <h3 className="hd-blk-h">{extra.title}</h3>
                {extra.content}
              </section>
            </SheetExtra.Provider>
          )}
        </div>
      )}
    </dialog>
  );
}

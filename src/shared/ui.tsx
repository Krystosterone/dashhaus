import { createContext, createElement, useContext, useEffect, useId, useRef, useState } from "react";
import type { ComponentType, CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useLongPress } from "./useLongPress";
import "./card.css";

/** CSS custom properties in a style prop. */
export type Vars = CSSProperties & Record<`--${string}`, string | number>;

/* ---------- Colour ----------
   One accent hue (tokens.css --brand-c/--brand-h) means on: solid for energy, soft for on-but-not-energy.
   Neutrals for the rest.
   A widget's own colour is the "colour slot": opt-in, painted on the orb and nowhere else. */

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

/** Card titles are H2 outside a titled section and H3 inside one. Detail sheets reset to H2. */
export const CardHeadingLevelContext = createContext<2 | 3>(2);

/** The props every card widget takes, whatever its entity. A widget's props extend this. */
export interface CardProps {
  /** "card" sits on the dashboard; "sheet" is the detail view with everything visible. */
  variant?: "card" | "sheet";
  /** Card footprint. Standard is 128px; compact is 60px; featured is 264px at every width. */
  footprint?: WidgetFootprint;
  /**
   * Compact only. false removes the inline control, shows the value in its place, and makes the row open
   * the detail sheet. The orb keeps its tap and hold actions. Default true.
   */
  showControl?: boolean;
  /** Card only: the name, and press and hold on the orb, open the details sheet. */
  onOpenDetails?: () => void;
  onClose?: () => void;
  /** Opt-in colour for the orb. */
  color?: ColorProp;
}

/** A titled bundle's lid: what the members make up, and its room. Members don't repeat what it says. */
export const BundleLid = createContext<{ title: string; area?: string } | null>(null);

const sameArea = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * What a card widget derives from its variant and footprint. `code` is the widget's class prefix ("lw").
 * Spread `article` onto the `<article>`, give `nameId` to the `CardTitle`, and build other ids from `uid`.
 * Show `area`, not the entity's own: under a titled bundle's lid a member in the lid's room has none on its
 * card (the lid says it once, for all of them), and its sheet, seen without the lid, says whose part it is.
 */
export function useCard(code: string, { variant = "card", footprint = "standard", showControl = true, area: own }: Pick<CardProps, "variant" | "footprint" | "showControl"> & { area?: string }) {
  const uid = useId();
  const lid = useContext(BundleLid);
  const sheet = variant === "sheet";
  const compact = !sheet && footprint === "compact";
  const featured = !sheet && footprint === "featured";
  const bare = compact && !showControl;
  const nameId = `${uid}-n`;
  const inLidRoom = lid != null && (own == null || (lid.area != null && sameArea(own, lid.area)));
  const area = !lid ? own
    : sheet ? [lid.title, inLidRoom ? lid.area : own].filter(Boolean).join(" · ")
    : inLidRoom ? undefined : own;
  return {
    uid,
    nameId,
    area,
    sheet,
    compact,
    featured,
    bare,
    article: {
      className: `hd ${code}${sheet ? " hd--sheet" : ""}${compact ? " hd--compact" : ""}${featured ? " hd--featured" : ""}`,
      "data-control": bare ? "off" : undefined,
      "aria-labelledby": nameId,
    },
  };
}

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

/** One measured reading per hour: a number, "unavailable", or null for hours ahead and before the first reading. */
export type Reading = number | "unavailable" | null;

/**
 * Scale readings to 0.12-1 for a Today strip, keeping gaps and hours ahead; min and max are null with no
 * reading yet. `minSpan` keeps a near-flat day from filling the strip (0.5° for a temperature, 1 bpm …).
 */
export function normalizeReadings(series: Reading[], minSpan = 0.5): { samples: HourSample[]; min: number | null; max: number | null } {
  const nums = series.filter((x): x is number => typeof x === "number");
  if (!nums.length) return { samples: series.map((x) => (typeof x === "number" ? 0 : x)), min: null, max: null };
  const min = Math.min(...nums), max = Math.max(...nums);
  const span = Math.max(max - min, minSpan);
  return { samples: series.map((x) => (typeof x === "number" ? 0.12 + (0.88 * (x - min)) / span : x)), min, max };
}

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

/* ---------- Card title. With onOpen, the name is the details button: tap the name for the sheet. ----------
   The button's hit area is stretched by CSS (.hd-open::after) over the header, or the whole compact row.
   `id` labels the card and the heading, so it sits on the name alone; the hint ("details") only joins the button's name. */
export function CardTitle({ id, name, onOpen, openHint = "details", children }: { id: string; name: string; onOpen?: () => void; openHint?: string; children?: ReactNode }) {
  const Heading = useContext(CardHeadingLevelContext) === 3 ? "h3" : "h2";
  return (
    <div className="hd-title">
      {/* Labelled by the name alone, so the heading stays "Kitchen" while the button inside reads "Kitchen details". */}
      <Heading className="hd-name" aria-labelledby={onOpen ? id : undefined}>
        {onOpen
          ? (
            <button type="button" className="hd-open" title={name} aria-label={`${name} ${openHint}`} aria-haspopup="dialog" onClick={onOpen}>
              <span id={id}>{name}</span>
              <svg className="hd-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5l4.5 4.5L6 12.5" /></svg>
            </button>
          )
          : <span id={id} title={name}>{name}</span>}
      </Heading>
      {children}
    </div>
  );
}

/** Round icon button. On cards it only closes the sheet; details open from the title or a press and hold. */
export function CircleButton({ label, onClick, autoFocus, children }: { label: string; onClick?: () => void; autoFocus?: boolean; children: ReactNode }) {
  return (
    <button type="button" className="hd-circ" aria-label={label} onClick={onClick} data-autofocus={autoFocus || undefined}>
      <span className="hd-circ-i">{children}</span>
    </button>
  );
}

/** The sheet's close button. Focus lands on it when the sheet opens, unless something in the sheet needs it more. */
export function SheetClose({ label, onClick, focusOnOpen = true }: { label: string; onClick?: () => void; focusOnOpen?: boolean }) {
  return (
    <CircleButton
      label={label}
      onClick={onClick}
      // Dialog focus management, not page-load focus theft.
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={focusOnOpen}
    ><IconClose /></CircleButton>
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

/** Full-width toggle button: raised when off, the accent when on. */
/** `turnOn`: the off-state control of a unit whose status line already says Off (climate, humidifier). */
export function TogglePill({ label, on, onToggle, children, extra, turnOn }: { label: string; on: boolean; onToggle: () => void; children: ReactNode; extra?: ReactNode; turnOn?: boolean }) {
  return (
    <button type="button" className={turnOn ? "hd-pill hd-pill--turn-on" : "hd-pill"} aria-label={label} aria-pressed={on} onClick={onToggle}>
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

/**
 * A reading's figures as a readout, with no container. `label` says them; what shows is their stylized
 * rendering. With `onOpen` it is the button that opens details, otherwise an image of its label.
 */
export function Readout({ label, onOpen, children }: { label: string; onOpen?: () => void; children: ReactNode }) {
  const inner = <span className="hd-read-i" aria-hidden="true">{children}</span>;
  return onOpen
    ? <button type="button" className="hd-read" aria-label={`${label}. Open details`} onClick={onOpen}>{inner}</button>
    : <div className="hd-read" role="img" aria-label={label}>{inner}</div>;
}

const IconMinus = () => <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8" /></svg>;
const IconPlus = () => <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8M7 3v8" /></svg>;

/**
 * Setpoint stepper: a groove with a minus and a plus button at its ends, the value between them.
 * `kicker` says what the value does ("Heat to"); it shows from 260 px and in the sheet. `cue` is a small
 * icon before the value, for compact rows that keep their mode there.
 */
export function Stepper({ label, kicker, cue, value, unit, format = String, min, max, step, onChange }: { label: string; kicker?: string; cue?: ReactNode; value: number; unit: string; format?: (v: number) => string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const down = Math.max(min, +(value - step).toFixed(2));
  const up = Math.min(max, +(value + step).toFixed(2));
  return (
    <div className="hd-step" role="group" aria-label={label}>
      <button type="button" className="hd-step-b" aria-label={`Lower to ${format(down)}${unit}`} disabled={value <= min} onClick={() => onChange(down)}><span><IconMinus /></span></button>
      <span className="hd-step-v" aria-live="polite">
        {kicker && <span className="hd-step-k">{kicker}</span>}
        {cue && <span className="hd-step-cue">{cue}</span>}
        {format(value)}<small>{unit}</small>
      </span>
      <button type="button" className="hd-step-b" aria-label={`Raise to ${format(up)}${unit}`} disabled={value >= max} onClick={() => onChange(up)}><span><IconPlus /></span></button>
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

/* ---------- Choice chips: one of several, the selected one in the accent ---------- */
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
        <CardHeadingLevelContext.Provider value={2}>
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
        </CardHeadingLevelContext.Provider>
      )}
    </dialog>
  );
}

/* ---------- Sheet and tile for a widget ----------
   Every card widget renders twice: as the card, and as itself in its details sheet (`variant="sheet"`).
   These two build the wrappers so a widget only writes the card. */

/** A widget's sheet props: everything but the card-only ones, plus whether it is open. */
export type SheetProps<P> = Omit<P, "variant" | "footprint" | "onOpenDetails" | "onClose"> & { open: boolean; onClose: () => void };
/** A widget's tile props: the card's, with the sheet wired in. */
export type TileProps<P> = Omit<P, "variant" | "onOpenDetails" | "onClose"> & { defaultOpen?: boolean };

/** The details sheet for a widget: the widget itself as `variant="sheet"`, in a `Sheet`. */
export function detailsSheet<P extends CardProps & { entity: { name: string } }>(Widget: ComponentType<P>, label = (name: string) => `${name} details`) {
  function DetailsSheet({ open, onClose, ...props }: SheetProps<P>) {
    const p = { ...props, variant: "sheet", onClose } as unknown as P;
    return <Sheet open={open} onClose={onClose} label={label(p.entity.name)}>{createElement(Widget, p)}</Sheet>;
  }
  DetailsSheet.displayName = `${(Widget.displayName ?? Widget.name).replace(/Widget$/, "")}Sheet`;
  return DetailsSheet;
}

/** A dashboard-ready tile for a widget: the card in its size container, plus its details sheet. */
export function detailsTile<P extends CardProps>(Widget: ComponentType<P>, DetailsSheet: ComponentType<SheetProps<P>>) {
  function Tile({ defaultOpen = false, ...props }: TileProps<P>) {
    const [open, setOpen] = useState(defaultOpen);
    // The sheet gets the card's props too: a sheet ignores footprint.
    return (
      <>
        <div className="hd-c">{createElement(Widget, { ...props, onOpenDetails: () => setOpen(true) } as unknown as P)}</div>
        {createElement(DetailsSheet, { ...props, open, onClose: () => setOpen(false) } as unknown as SheetProps<P>)}
      </>
    );
  }
  Tile.displayName = `${(Widget.displayName ?? Widget.name).replace(/Widget$/, "")}Tile`;
  return Tile;
}

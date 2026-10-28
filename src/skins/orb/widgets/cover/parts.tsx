import type { Vars } from "../../shared/ui";
import { useSlider } from "../../../../primitives/slider";

/** Width of a fully drawn-back curtain panel, in px. Matches --stub in CoverWidget.css. */
const STUB = 14;

/** Magnetic ends: within 3% of either end means fully closed or fully open, never a stray 1%. */
export const snapEnds = (raw: number) => (raw <= 3 ? 0 : raw >= 97 ? 100 : raw);

/**
 * The window, on one bar: the groove is the fabric, the accent is the daylight let through.
 * Curtains: two panels close in from both ends, and dragging away from the middle pulls them apart.
 * Blinds and shades: one panel covers from the right; drag right to open.
 * Tap jumps (animated); drags follow the finger; the ends are magnetic; while the cover moves, the fabric glides linearly.
 */
export function PositionBar({ id, label, kind, position, moving, text, onChange }: {
  id: string; label: string; kind: "curtain" | "shade"; position: number; moving: boolean; text: string; onChange: (v: number) => void;
}) {
  const slider = useSlider<HTMLDivElement>({
    value: Math.round(position),
    min: 0,
    max: 100,
    inset: 0,
    // Curtains open from the middle: the distance from it, out to a drawn-back panel, is how far open.
    along: kind === "curtain" ? (x, r) => Math.min(1, Math.abs(x - (r.left + r.width / 2)) / Math.max(1, r.width / 2 - STUB)) : undefined,
    snap: (raw) => snapEnds(Math.round(raw)),
    valueText: (v) => (v === 0 ? "Closed" : v === 100 ? "Open" : `${v} percent open`),
    onChange,
  });
  const pos = slider.value;
  return (
    <div className="cv-bar" {...slider.rootProps} data-kind={kind} data-moving={moving || undefined} style={{ "--p": slider.fraction(pos).toFixed(3) } as Vars}>
      <span className="cv-lab" aria-hidden="true">{text}</span>
      {/* The daylight with its own copy of the label, so the text flips where daylight passes under it. */}
      <span className="cv-day" aria-hidden="true"><span className="cv-lab">{text}</span></span>
      <div className="cv-hit" {...slider.hitProps} />
      <input id={id} className="cv-in" aria-label={label} {...slider.inputProps} />
    </div>
  );
}

const IconUp = () => <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 8.5 7 5l3.5 3.5" /></svg>;
const IconDown = () => <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 5.5 7 9l3.5-3.5" /></svg>;

/** For covers without a position (most garage doors): close at one end, open at the other, state or Stop in the middle. */
export function OpenCloseControl({ name, open, moving, text, canStop, onOpen, onClose, onStop }: {
  name: string; open: boolean; moving: boolean; text: string; canStop: boolean; onOpen: () => void; onClose: () => void; onStop: () => void;
}) {
  return (
    <div className="cv-oc" data-open={open || undefined} role="group" aria-label={name}>
      <button type="button" className="cv-oc-b" aria-label={`Close ${name}`} disabled={!open && !moving} onClick={onClose}><span><IconDown /></span></button>
      {moving && canStop
        ? <button type="button" className="cv-oc-stop" onClick={onStop}><i aria-hidden="true" />Stop</button>
        : <span className="cv-oc-v" aria-live="polite">{text}</span>}
      <button type="button" className="cv-oc-b" aria-label={`Open ${name}`} disabled={open && !moving} onClick={onOpen}><span><IconUp /></span></button>
    </div>
  );
}

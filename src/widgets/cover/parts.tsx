import type { Vars } from "../../shared/ui";
import { useTrack, trackPos } from "../../hooks/useTrack";

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
  const pos = Math.min(100, Math.max(0, Math.round(position)));
  const track = useTrack<HTMLDivElement>((x, el) => {
    const r = el.getBoundingClientRect();
    const t = kind === "curtain"
      ? Math.min(1, Math.max(0, Math.abs(x - (r.left + r.width / 2)) / Math.max(1, r.width / 2 - STUB)))
      : trackPos(x, r, 0);
    // Magnetic ends: snapEnds maps within-3% to the ends.
    const v = snapEnds(Math.round(t * 100));
    if (v !== pos) onChange(v);
  });
  return (
    <div className="cv-bar" ref={track.ref} data-kind={kind} data-moving={moving || undefined} style={{ "--p": (pos / 100).toFixed(3) } as Vars}>
      <span className="cv-lab" aria-hidden="true">{text}</span>
      {/* The daylight with its own copy of the label, so the text flips where daylight passes under it. */}
      <span className="cv-day" aria-hidden="true"><span className="cv-lab">{text}</span></span>
      <div className="cv-hit" aria-hidden="true" {...track.handlers} />
      <input
        id={id} className="cv-in" type="range" min={0} max={100} step={1} value={pos}
        aria-label={label} aria-valuetext={pos === 0 ? "Closed" : pos === 100 ? "Open" : `${pos} percent open`}
        onKeyDown={track.onKeyDown} onChange={(e) => onChange(Number(e.target.value))}
      />
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

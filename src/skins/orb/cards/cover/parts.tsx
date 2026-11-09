import { SliderTrack } from "../../shared/ui";
import { snapEnds } from "@dashhaus/core/entities/cover/position";
import { positionText } from "@dashhaus/core/entities/cover/words";

/** Width of a fully drawn-back curtain panel, in px. Matches --stub in CoverCard.css. */
const STUB = 14;

/**
 * The window, on one bar: the groove is the fabric, the accent is the daylight let through.
 * Curtains: two panels close in from both ends, and dragging away from the middle pulls them apart.
 * Blinds and shades: one panel covers from the right; drag right to open.
 * Tap jumps (animated); drags follow the finger; the ends are magnetic; while the cover moves, the fabric glides linearly.
 */
export function PositionBar({ id, label, kind, position, moving, text, onChange }: {
  id: string; label: string; kind: "curtain" | "shade"; position: number; moving: boolean; text: string; onChange: (v: number) => void;
}) {
  // The track's fill is the daylight, and carries its own copy of the label, so the text flips where daylight passes.
  return (
    <SliderTrack
      id={id}
      label={label}
      slider={{
        value: Math.round(position),
        min: 0,
        max: 100,
        inset: 0,
        // Curtains open from the middle: the distance from it, out to a drawn-back panel, is how far open.
        along: kind === "curtain" ? (x, r) => Math.min(1, Math.abs(x - (r.left + r.width / 2)) / Math.max(1, r.width / 2 - STUB)) : undefined,
        snap: (raw) => snapEnds(Math.round(raw)),
        valueText: positionText,
        onChange,
      }}
      className="cv-bar"
      text={() => text}
      precision={3}
      data-kind={kind}
      data-moving={moving || undefined}
    />
  );
}

const IconUp = () => <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 8.5 7 5l3.5 3.5" /></svg>;
const IconDown = () => <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 5.5 7 9l3.5-3.5" /></svg>;

/**
 * For covers without a position (most garage doors), and for a garage door, door or gate whatever it reports: close at
 * one end, open at the other, state or Stop in the middle. The end that can't act lies flat; `either`, where the cover
 * is isn't known, so both ends act. `asks`: its ends ask first, which their names say with an ellipsis ("Close Garage
 * door…"), as every orb action that asks does. `flat`: both ends lie flat, while a question already stands or while it
 * moves where it can't be stopped.
 */
export function OpenCloseControl({ name, open, moving, either = false, asks = false, flat = false, text, canStop, onOpen, onClose, onStop }: {
  name: string; open: boolean; moving: boolean; either?: boolean; asks?: boolean; flat?: boolean; text: string; canStop: boolean; onOpen: () => void; onClose: () => void; onStop: () => void;
}) {
  const more = asks ? "…" : "";
  return (
    <div className="hd-step" data-open={open || undefined} role="group" aria-label={name}>
      <button type="button" className="cv-oc-b" aria-label={`Close ${name}${more}`} disabled={flat || (!open && !moving && !either)} onClick={onClose}><span><IconDown /></span></button>
      {moving && canStop
        ? <button type="button" className="cv-oc-stop" onClick={onStop}><i aria-hidden="true" />Stop</button>
        : <span className="cv-oc-v" aria-live="polite">{text}</span>}
      <button type="button" className="cv-oc-b" aria-label={`Open ${name}${more}`} disabled={flat || (open && !moving && !either)} onClick={onOpen}><span><IconUp /></span></button>
    </div>
  );
}

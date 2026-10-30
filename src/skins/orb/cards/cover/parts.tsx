import { Track } from "../../shared/ui";
import { useSlider } from "@scope/core/primitives";
import { snapEnds } from "@scope/core/entities/cover/position";

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
  // The track's fill is the daylight, and carries its own copy of the label, so the text flips where daylight passes.
  return (
    <Track
      slider={slider}
      inputs={[{ id, "aria-label": label, ...slider.inputProps }]}
      className="cv-bar"
      text={text}
      data-kind={kind}
      data-moving={moving || undefined}
      style={{ "--v": slider.fraction(pos).toFixed(3) }}
    />
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

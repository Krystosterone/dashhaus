import { useState } from "react";
import type { PointerEvent } from "react";
import { DYSON_AHEAD, DYSON_ANGLE_MAX, DYSON_ANGLE_MIN, aimAngles, aimOf, aimWords } from "@dashhaus/core/entities/dyson/labels";

/** The dial's ring, in its own units: the groove the sweep lights, round the fan seen from above. */
const RING = 78;
const FAN = 17;

/** A Dyson angle on the dial, seen from above with ahead at the top: 180° up, the angle growing clockwise. */
const turn = (angle: number) => angle - DYSON_AHEAD;
const at = (angle: number, r: number) => {
  const rad = (turn(angle) * Math.PI) / 180;
  return { x: +(r * Math.sin(rad)).toFixed(2), y: +(-r * Math.cos(rad)).toFixed(2) };
};
/** The ring's arc from `low` to `high`, clockwise. */
function arc(low: number, high: number, r = RING) {
  const a = at(low, r);
  const b = at(high, r);
  return `M${a.x} ${a.y}A${r} ${r} 0 ${high - low > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}
/** A pointer's Dyson angle around the dial's centre. */
function angleAt(event: PointerEvent<SVGSVGElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - (box.left + box.width / 2);
  const y = event.clientY - (box.top + box.height / 2);
  const deg = (Math.atan2(x, -y) * 180) / Math.PI;
  return (((deg + DYSON_AHEAD) % 360) + 360) % 360;
}

export interface AimDialProps {
  id: string;
  /** The fan's name, for its spoken label. */
  name: string;
  low: number;
  high: number;
  /** Aims it: the new angles, the sweep's width kept. Sent once, when a drag is let go. */
  onChange: (low: number, high: number) => void;
}

/**
 * Where a Pure Cool or Hot+Cool points, seen from above: the fan in the middle, its front turned to where it aims; the
 * ring the groove it turns in, 5-355° round its base with ahead at the top; the accent its sweep along the ring and
 * a beam to where it aims, or the beam alone while it holds still. Drag anywhere on the dial to aim it, the width
 * kept; the dial follows the finger and sends the angles once, when let go. The arrow keys turn it 5° at a time.
 * The fan reports no live position, so this draws what it was set to, never where its head is now.
 */
export function AimDial({ id, name, low, high, onChange }: AimDialProps) {
  const spread = high - low;
  const [dragging, setDragging] = useState<{ low: number; high: number } | null>(null);
  const shown = dragging ?? { low, high };
  const aim = aimOf(shown.low, shown.high);
  const aimAt = (angle: number) => {
    const { angle_low, angle_high } = aimAngles(angle, spread);
    return { low: angle_low, high: angle_high };
  };
  const tip = at(aim, RING);
  const said = `Points ${aimWords(aim)}${spread ? `, sweeping ${spread}°` : ""}`;

  return (
    <div className="hd-blk dy-aim">
      <p className="hd-blk-h"><label htmlFor={id}>Points</label><span className="hd-blk-v" aria-hidden="true">{aimWords(aim)}</span></p>
      <div className="dy-dial">
        <input
          id={id}
          className="dy-dial-input"
          type="range"
          min={DYSON_ANGLE_MIN}
          max={DYSON_ANGLE_MAX}
          step={5}
          value={aim}
          aria-label={`${name} aims`}
          aria-valuetext={said}
          onChange={(event) => {
            const next = aimAt(event.currentTarget.valueAsNumber);
            onChange(next.low, next.high);
          }}
        />
        <svg
          viewBox="-100 -100 200 200"
          aria-hidden="true"
          // A dial turns in two dimensions, so the page doesn't scroll from it: the prototype's own, until the dial is a part.
          style={{ touchAction: "none" }}
          data-dragging={dragging ? "" : undefined}
          onPointerDown={(event) => {
            if (event.button > 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(aimAt(angleAt(event)));
          }}
          onPointerMove={(event) => {
            if (dragging) setDragging(aimAt(angleAt(event)));
          }}
          onPointerUp={() => {
            if (!dragging) return;
            setDragging(null);
            if (dragging.low !== low || dragging.high !== high) onChange(dragging.low, dragging.high);
          }}
          onPointerCancel={() => setDragging(null)}
        >
          <circle className="dy-dial-ring" r={RING} />
          <text className="dy-dial-ahead" x="0" y={-RING - 12} textAnchor="middle">Ahead</text>
          <path className="dy-dial-back" d={`M0 ${RING - 7}V${RING + 7}`} />
          {spread > 0 && <path className="dy-dial-sweep" d={arc(shown.low, shown.high)} />}
          <path className="dy-dial-beam" d={`M${at(aim, FAN + 4).x} ${at(aim, FAN + 4).y}L${tip.x} ${tip.y}`} />
          <g className="dy-dial-fan" style={{ transform: `rotate(${turn(aim)}deg)` }}>
            <circle r={FAN} />
            <path d={`M-6 ${-FAN + 5}H6`} />
          </g>
          <circle className="dy-dial-knob" cx={tip.x} cy={tip.y} r="10" />
        </svg>
      </div>
    </div>
  );
}

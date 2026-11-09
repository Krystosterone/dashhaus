import { useState } from "react";
import type { PointerEvent } from "react";
import { DYSON_LOCAL_ANGLES, aimAngles, aimOf, aimWords } from "@dashhaus/core/entities/dyson/labels";
import type { DysonAngles } from "@dashhaus/core/entities/dyson/labels";

/** The dial, in its own units: a ring of ticks round the fan seen from above, ahead at the top. */
const OUTER = 86;
const INNER = 62;
/** The knob that aims it, on its stem from the fan's head, inside the ring so the lit ticks show beyond it. */
const KNOB = 48;
const HEAD = 22;
/** A tick every 5°. */
const TICK = 5;
/** Held still, the beam lights the ticks this far either side of where it points. */
const BEAM = 8;

/** A pointer's offset from ahead, in degrees, clockwise on the dial: turned left of ahead is negative. */
function offsetAt(event: PointerEvent<SVGSVGElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - (box.left + box.width / 2);
  const y = event.clientY - (box.top + box.height / 2);
  return (Math.atan2(x, -y) * 180) / Math.PI;
}
/** A point `r` from the centre, `deg` clockwise from ahead. */
const at = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: +(r * Math.sin(rad)).toFixed(2), y: +(-r * Math.cos(rad)).toFixed(2) };
};

export interface AimDialProps {
  id: string;
  /** The fan's name, for its spoken label. */
  name: string;
  low: number;
  high: number;
  /** The range its angles take and the one ahead (its integration's). */
  angles?: DysonAngles;
  /** Aims it: the new angles, the sweep's width kept. Sent once, when a drag is let go. */
  onChange: (low: number, high: number) => void;
}

/**
 * Where a Pure Cool or Hot+Cool points, seen from above with ahead at the top, so its left is on the left: a ring of
 * ticks round it, every 5° it can turn to, lit in the accent where it sweeps (a narrow beam while it holds still); its
 * base and cable fixed at the back, its head turned to where it aims, a stem from it to a ring knob. Drag anywhere on
 * the dial to aim it, the width kept: the dial follows the finger and sends the angles once, when let go; the arrow
 * keys turn it 5° at a time. The fan reports no live position, so this draws what it was set to, never where its head
 * is mid-sweep.
 */
export function AimDial({ id, name, low, high, angles = DYSON_LOCAL_ANGLES, onChange }: AimDialProps) {
  const spread = high - low;
  const [dragging, setDragging] = useState<{ low: number; high: number } | null>(null);
  const shown = dragging ?? { low, high };
  const aim = aimOf(shown.low, shown.high);
  const aimAt = (angle: number) => {
    const { angle_low, angle_high } = aimAngles(angle, spread, angles);
    return { low: angle_low, high: angle_high };
  };
  /** A pointer's angle, wrapped into the fan's range the nearer way round past the back. */
  const angleAt = (event: PointerEvent<SVGSVGElement>) => {
    const raw = angles.ahead + offsetAt(event);
    return raw > angles.max ? (raw - angles.max < angles.min + 360 - raw ? angles.max : angles.min) : raw;
  };
  const words = aimWords(aim, angles.ahead);
  const said = `Points ${words}${spread ? `, sweeping ${spread}°` : ""}`;
  const turned = aim - angles.ahead;
  // Every 5° it can turn to, as an offset from ahead; lit where it sweeps, or within the beam while it holds still.
  const ticks: { deg: number; lit: boolean }[] = [];
  for (let a = angles.min; a <= angles.max; a += TICK) {
    const lit = spread ? a >= shown.low && a <= shown.high : Math.abs(a - aim) <= BEAM;
    ticks.push({ deg: a - angles.ahead, lit });
  }
  const knob = at(turned, KNOB);
  const stem = at(turned, HEAD);
  // The middle of the gap it can't turn to, behind it: past the highest angle and round to the lowest.
  const back = (angles.max + angles.min + 360) / 2 - angles.ahead;

  return (
    <div className="hd-blk dy-aim">
      <p className="hd-blk-h"><label htmlFor={id}>Points</label><span className="hd-blk-v" aria-hidden="true">{words.charAt(0).toUpperCase() + words.slice(1)}</span></p>
      <div className="dy-dial">
        <input
          id={id}
          className="dy-dial-input"
          type="range"
          min={angles.min}
          max={angles.max}
          step={TICK}
          value={aim}
          aria-label={`${name} aims`}
          aria-valuetext={said}
          onChange={(event) => {
            const next = aimAt(event.currentTarget.valueAsNumber);
            onChange(next.low, next.high);
          }}
        />
        <svg
          viewBox="-100 -104 200 208"
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
          {ticks.map(({ deg, lit }) => {
            const a = at(deg, INNER);
            const b = at(deg, OUTER);
            return <path key={deg} className="dy-dial-tick" data-lit={lit ? "" : undefined} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} />;
          })}
          <text className="dy-dial-ahead" x="0" y={-OUTER - 8} textAnchor="middle">Ahead</text>
          {/* The cable leaves the base at the back, through the gap it can't turn to. */}
          <path className="dy-dial-cable" d={`M${at(back, 16).x} ${at(back, 16).y}Q${at(back - 6, 60).x} ${at(back - 6, 60).y} ${at(back, 100).x} ${at(back, 100).y}`} />
          <circle className="dy-dial-base" r="16" />
          {/* The head, its stem and the knob turn as one, so a new aim eases round; a drag follows at once. */}
          <g className="dy-dial-turn" style={{ transform: `rotate(${turned}deg)` }}>
            <rect className="dy-dial-head" x="-15" y="-22" width="30" height="10" rx="5" />
          </g>
          <path className="dy-dial-stem" d={`M${stem.x} ${stem.y}L${knob.x} ${knob.y}`} />
          <circle className="dy-dial-knob" cx={knob.x} cy={knob.y} r="9" />
        </svg>
      </div>
    </div>
  );
}

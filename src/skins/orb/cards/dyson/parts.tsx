import { useState } from "react";
import type { PointerEvent } from "react";
import { DYSON_AHEAD, DYSON_ANGLE_MAX, DYSON_ANGLE_MIN, aimAngles, aimOf, aimWords } from "@dashhaus/core/entities/dyson/labels";

/** The dial, in its own units: the disc the fan sits on, seen from above, its ticks round the rim. */
const DISC = 84;
/** How far the airflow reaches, and the knob that aims it, inside the rim so "Ahead" stays clear above it. */
const REACH = 76;
const KNOB = 64;
/** Half the beam's width: held still, the airflow still spreads a little, so Still is a narrow wedge, not a line. */
const BEAM = 7;
/** A tick every 15°, a longer one every 45°, from ahead. */
const TICKS = Array.from({ length: 24 }, (_, i) => i * 15);

/** A Dyson angle on the dial, seen from above with ahead at the top: 180° up, the angle growing clockwise. */
const turn = (angle: number) => angle - DYSON_AHEAD;
const at = (angle: number, r: number) => {
  const rad = (turn(angle) * Math.PI) / 180;
  return { x: +(r * Math.sin(rad)).toFixed(2), y: +(-r * Math.cos(rad)).toFixed(2) };
};
/** The airflow's wedge for a sweep of `spread`, drawn round ahead; the dial turns it to where it aims. */
function wedge(spread: number) {
  const half = spread / 2 + BEAM;
  const a = at(DYSON_AHEAD - half, REACH);
  const b = at(DYSON_AHEAD + half, REACH);
  return `M0 0L${a.x} ${a.y}A${REACH} ${REACH} 0 ${half * 2 > 180 ? 1 : 0} 1 ${b.x} ${b.y}Z`;
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
 * Where a Pure Cool or Hot+Cool points, seen from above: the fan on a recessed disc, its loop across its front; ticks
 * every 15° round the rim, ahead at the top; its airflow a wedge in the accent as wide as it sweeps, a narrow beam
 * while it holds still, turning with the fan; a raised knob where it aims. Drag anywhere on the dial to aim it, the
 * width kept: the dial follows the finger and sends the angles once, when let go; the arrow keys turn it 5° at a time.
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
  const knob = at(aim, KNOB);
  const words = aimWords(aim);
  const said = `Points ${words}${spread ? `, sweeping ${spread}°` : ""}`;

  return (
    <div className="hd-blk dy-aim">
      <p className="hd-blk-h"><label htmlFor={id}>Points</label><span className="hd-blk-v" aria-hidden="true">{words.charAt(0).toUpperCase() + words.slice(1)}</span></p>
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
          viewBox="-100 -104 200 200"
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
          <circle className="dy-dial-disc" r={DISC} />
          {TICKS.map((t) => {
            const long = t % 45 === 0;
            const a = at(DYSON_AHEAD + t, DISC - (long ? 9 : 5));
            const b = at(DYSON_AHEAD + t, DISC - 1);
            const kind = t === 0 ? " dy-dial-tick--ahead" : long ? " dy-dial-tick--long" : "";
            return <path key={t} className={`dy-dial-tick${kind}`} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} />;
          })}
          <text className="dy-dial-ahead" x="0" y={-DISC - 8} textAnchor="middle">Ahead</text>
          {/* The airflow and the fan turn as one, so a new aim eases round rather than jumping; a drag follows at once. */}
          <g className="dy-dial-turn" style={{ transform: `rotate(${turn(aim)}deg)` }}>
            <path className="dy-dial-air" d={wedge(spread)} />
            <circle className="dy-dial-base" r="15" />
            <rect className="dy-dial-loop" x="-17" y="-24" width="34" height="9" rx="4.5" />
          </g>
          <circle className="dy-dial-knob" cx={knob.x} cy={knob.y} r="10" />
        </svg>
      </div>
    </div>
  );
}

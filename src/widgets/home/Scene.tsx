/*
 * The house, as a white architectural model on a plinth: neutral materials from the --scene-*
 * tokens, crisp edges, no sky. The weather is told by the rest of the card in the house style:
 * the glow behind it is the sunshine, the icon is the condition. At night the windows light up
 * in lamp tone. Nothing moves: a wall panel shows this all day.
 */

type V3 = [number, number, number];
const A = 7, Z = 8, CX = 100, CY = 92;
const pt = ([x, y, z]: V3) => `${(CX + (x - y) * A).toFixed(1)},${(CY + ((x + y) * A) / 2 - z * Z).toFixed(1)}`;
const poly = (...p: V3[]) => p.map(pt).join(" ");
const at = (x: number, y: number, z: number) => { const [X, Y] = pt([x, y, z]).split(",").map(Number); return { X, Y }; };

// Plinth: 10 x 10, 1.2 deep. House: x 2.2-7.2, y 3.2-7.4, walls 3.6 high, ridge along x.
const D = -1.2;
const H = { x0: 2.2, x1: 7.2, y0: 3.2, y1: 7.4, w: 3.6, ry: 5.3, rz: 6.0, o: 0.35, ez: 3.35 };
const RX0 = H.x0 - H.o, RX1 = H.x1 + H.o, RY0 = H.y0 - H.o, RY1 = H.y1 + H.o;

const leftWin = (xa: number, xb: number, za: number, zb: number) => poly([xa, H.y1, za], [xb, H.y1, za], [xb, H.y1, zb], [xa, H.y1, zb]);
const gableWin = (ya: number, yb: number, za: number, zb: number) => poly([H.x1, ya, za], [H.x1, yb, za], [H.x1, yb, zb], [H.x1, ya, zb]);

/** A model tree: a sphere on a short stem. */
function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const b = at(x, y, 0);
  return (
    <g className="sc-tree">
      <ellipse cx={b.X + 3 * s} cy={b.Y + 1} rx={8 * s} ry={3.5 * s} className="sc-shadow" />
      <path d={`M${b.X} ${b.Y}v${-8 * s}`} className="sc-stem" />
      <circle cx={b.X} cy={b.Y - 15 * s} r={9 * s} className="sc-tree-a" />
      <path d={`M${b.X - 9 * s} ${b.Y - 15 * s}a${9 * s} ${9 * s} 0 0 0 ${18 * s} 0`} className="sc-tree-b" />
    </g>
  );
}

export function Scene({ night, off }: { night: boolean; off?: boolean }) {
  return (
    <svg className="sc" viewBox="24 54 152 128" preserveAspectRatio="xMidYMid meet" aria-hidden="true" data-night={night || undefined} data-off={off || undefined}>
      <g className="sc-plinth">
        <polygon className="sc-side-a" points={poly([0, 10, 0], [10, 10, 0], [10, 10, D], [0, 10, D])} />
        <polygon className="sc-side-b" points={poly([10, 0, 0], [10, 10, 0], [10, 10, D], [10, 0, D])} />
        <polygon className="sc-top" points={poly([0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0])} />
        <polygon className="sc-path" points={poly([2.85, H.y1, 0], [3.75, H.y1, 0], [3.75, 10, 0], [2.85, 10, 0])} />
        <polygon className="sc-shadow" points={poly([H.x1, H.y0, 0], [H.x1 + 1.5, H.y0 + 0.6, 0], [H.x1 + 1.5, H.y1 + 0.6, 0], [H.x1, H.y1, 0])} />
      </g>

      <Tree x={9} y={1.3} />

      <g className="sc-house">
        <polygon className="sc-roof-b" points={poly([RX0, H.ry, H.rz], [RX1, H.ry, H.rz], [RX1, RY0, H.ez], [RX0, RY0, H.ez])} />
        <polygon className="sc-wall-a" points={poly([3.0, 4.7, 4.4], [3.8, 4.7, 4.4], [3.8, 4.7, 7.0], [3.0, 4.7, 7.0])} />
        <polygon className="sc-wall-b" points={poly([3.8, 3.9, 4.4], [3.8, 4.7, 4.4], [3.8, 4.7, 7.0], [3.8, 3.9, 7.0])} />
        <polygon className="sc-wall-a" points={poly([H.x0, H.y1, 0], [H.x1, H.y1, 0], [H.x1, H.y1, H.w], [H.x0, H.y1, H.w])} />
        <polygon className="sc-wall-b" points={poly([H.x1, H.y0, 0], [H.x1, H.y1, 0], [H.x1, H.y1, H.w], [H.x1, H.ry, H.rz - 0.25], [H.x1, H.y0, H.w])} />
        <polygon className="sc-roof-a" points={poly([RX0, H.ry, H.rz], [RX1, H.ry, H.rz], [RX1, RY1, H.ez], [RX0, RY1, H.ez])} />
        <polygon className="sc-roof-c" points={poly([RX1, RY0, H.ez], [RX1, H.ry, H.rz], [RX1, RY1, H.ez], [RX1, RY1, H.ez - 0.35], [RX1, H.ry, H.rz - 0.4], [RX1, RY0, H.ez - 0.35])} />
        <polygon className="sc-door" points={leftWin(2.85, 3.75, 0, 2.3)} />
      </g>

      <g className="sc-win">
        <polygon points={leftWin(4.4, 5.4, 1.3, 2.6)} />
        <polygon points={leftWin(5.95, 6.85, 1.3, 2.6)} />
        <polygon points={gableWin(4.55, 6.05, 1.3, 2.6)} />
        <polygon points={gableWin(4.95, 5.65, 3.9, 4.6)} />
      </g>

      <Tree x={0.9} y={8.9} s={0.7} />
    </svg>
  );
}

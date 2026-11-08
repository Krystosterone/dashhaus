import { useHaSun } from "@dashhaus/core";
import { sunPathDrawing } from "@dashhaus/core/entities/sun/drawing";
import { daylightSummary } from "@dashhaus/core/entities/sun/words";

/** Today's path of the sun as a line, the day so far solid and the rest dotted, with the sun on it. */
export function SunPath() {
  const { history } = useHaSun("sun.sun");
  if (!history) return null;
  const drawing = sunPathDrawing(history);
  const [x, y] = drawing.sun;
  return (
    <figure>
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" width={240} height={80}>
        {drawing.pieces.map((piece, i) => (
          <polyline
            key={i}
            points={piece.points.map(([px, py]) => `${px},${py}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={piece.part === "past" ? 2 : 1}
            strokeDasharray={piece.part === "past" ? undefined : "2 3"}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <circle cx={x} cy={y} r={0.02} fill="currentColor" />
      </svg>
      <figcaption>{daylightSummary(history)}</figcaption>
    </figure>
  );
}

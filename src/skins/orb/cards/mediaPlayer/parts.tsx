import type { CSSProperties } from "react";
import type { PlayheadNow } from "@dashhaus/core/hooks";
import { clockPlaces, playTimeSpoken, playedShare } from "@dashhaus/core/entities/mediaPlayer/position";
import { fmtPlayTime } from "@dashhaus/core/entities/format";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const DIGITS = { 6: [0, 1, 2, 3, 4, 5], 10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] } as const;

/**
 * How far in, as a readout: a thin line that fills as it plays, the time played under its start and the length under
 * its end. Nothing re-renders as it plays: the fill is a clip-path animation lasting the whole track, started `at`
 * seconds in, and each place of the clock is a strip of digits a timed animation steps through (a hard cut, as a
 * segment's), both held still while it is paused or buffering. A new position, a pause or a new track remounts them
 * (`key`), so they never drift from what Home Assistant says.
 */
export function Progress({ head }: { head: PlayheadNow }) {
  const run = head.running ? "running" : "paused";
  // Where it was when drawn, under the animation: what shows where nothing animates.
  const fill: Vars = { "--mp-len": `${head.duration}s`, "--mp-at": `${-head.at}s`, animationPlayState: run, clipPath: `inset(0 ${((1 - playedShare(head)) * 100).toFixed(3)}% 0 0)` };
  return (
    <div className="mp-prog" role="img" aria-label={`${playTimeSpoken(head.at)} of ${playTimeSpoken(head.duration)}`}>
      <span className="mp-bar"><span key={head.key} className="mp-fill" style={fill} /></span>
      <span className="mp-times" aria-hidden="true">
        <span key={head.key} className="mp-clock">
          {clockPlaces(head.at, head.duration).map((part, i) => (part.kind === "colon"
            ? <span key={i} className="mp-colon">:</span>
            : (
              <span key={i} className="mp-place">
                <span className="mp-reel" data-base={part.base} style={{ "--mp-cycle": `${part.cycle}s`, "--mp-off": `${-part.offset}s`, animationPlayState: run, transform: `translateY(${(-100 * part.digit) / part.base}%)` } as Vars}>
                  {DIGITS[part.base].map((d) => <span key={d}>{d}</span>)}
                </span>
              </span>
            )))}
        </span>
        <span>{fmtPlayTime(head.duration)}</span>
      </span>
    </div>
  );
}

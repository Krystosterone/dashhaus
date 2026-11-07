import type { CSSProperties } from "react";
import type { PlayheadNow } from "@dashhaus/core/hooks";
import { clockPlaces, playTimeSpoken, playedShare } from "@dashhaus/core/entities/mediaPlayer/position";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const DIGITS = { 6: [0, 1, 2, 3, 4, 5], 10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] } as const;
const state = (head: PlayheadNow) => (head.running ? "running" : "paused");

/**
 * How far in, along the foot of the screen: a rule in the unlit ink that lights from the left as it plays. It is a
 * clip-path animation lasting the whole track, started `at` seconds in, so nothing re-renders as it plays; held while
 * paused or buffering, and drawn again (`key`) when the position, the state or the track changes.
 */
export function ScreenProgress({ head }: { head: PlayheadNow }) {
  return (
    <span className="fd-mp-prog" aria-hidden="true">
      <span key={head.key} className="fd-mp-fill" style={{ "--fd-mp-len": `${head.duration}s`, "--fd-mp-at": `${-head.at}s`, animationPlayState: state(head), clipPath: `inset(0 ${((1 - playedShare(head)) * 100).toFixed(3)}% 0 0)` } as Vars} />
    </span>
  );
}

/**
 * The time played as the screen's figure, a segment clock in fixed places for the whole track (`M:SS`, `MM:SS`,
 * `H:MM:SS`): each place a strip of digits a timed animation steps through with a hard cut, as a segment turns, so it
 * keeps time with no re-render. Heard as the time when it was drawn, and the length.
 */
export function ScreenClock({ head }: { head: PlayheadNow }) {
  return (
    <span className="fd-mp-clock" role="img" aria-label={`${playTimeSpoken(head.at)} of ${playTimeSpoken(head.duration)}`}>
      <span key={head.key} className="fd-mp-places" aria-hidden="true">
        {clockPlaces(head.at, head.duration).map((part, i) => (part.kind === "colon"
          ? <span key={i} className="fd-mp-colon">:</span>
          : (
            <span key={i} className="fd-mp-place">
              <span className="fd-mp-reel" data-base={part.base} style={{ "--fd-mp-cycle": `${part.cycle}s`, "--fd-mp-off": `${-part.offset}s`, "--fd-mp-turns": part.turns, animationPlayState: state(head), transform: `translateY(${(-100 * part.digit) / part.base}%)` } as Vars}>
                {DIGITS[part.base].map((d) => <span key={d}>{d}</span>)}
              </span>
            </span>
          )))}
      </span>
    </span>
  );
}

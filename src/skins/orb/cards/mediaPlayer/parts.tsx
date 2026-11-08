import type { CSSProperties } from "react";
import type { PlayheadNow, Seek } from "@dashhaus/core/hooks";
import { clockPlaces, playTimeSpoken, playedShare } from "@dashhaus/core/entities/mediaPlayer/position";
import { fmtPlayTime } from "@dashhaus/core/entities/format";
import { SliderTrack } from "../../shared/ui";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const DIGITS = { 6: [0, 1, 2, 3, 4, 5], 10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] } as const;
const state = (head: PlayheadNow) => (head.running ? "running" : "paused");

/**
 * The played part: a clip-path animation lasting the whole track, started `at` seconds in, held while paused or
 * buffering; where it was when drawn sits inline under the animation, so it shows where nothing animates.
 */
function Fill({ head, className = "mp-fill" }: { head: PlayheadNow; className?: string }) {
  const fill: Vars = { "--mp-len": `${head.duration}s`, "--mp-at": `${-head.at}s`, animationPlayState: state(head), clipPath: `inset(0 ${((1 - playedShare(head)) * 100).toFixed(3)}% 0 0)` };
  return <span key={head.key} className={className} style={fill} />;
}

/** The time played: each place a strip of digits a timed animation steps through, a hard cut as a segment's. */
function Clock({ head }: { head: PlayheadNow }) {
  return (
    <span key={head.key} className="mp-clock">
      {clockPlaces(head.at, head.duration).map((part, i) => (part.kind === "colon"
        ? <span key={i} className="mp-colon">:</span>
        : (
          <span key={i} className="mp-place">
            <span className="mp-reel" data-base={part.base} style={{ "--mp-cycle": `${part.cycle}s`, "--mp-off": `${-part.offset}s`, "--mp-turns": part.turns, animationPlayState: state(head), transform: `translateY(${(-100 * part.digit) / part.base}%)` } as Vars}>
              {DIGITS[part.base].map((d) => <span key={d}>{d}</span>)}
            </span>
          </span>
        )))}
    </span>
  );
}

/**
 * How far in, as a readout: a thin line that fills as it plays, the time played under its start and the length under
 * its end. Nothing re-renders as it plays: the fill and each place of the clock run on their own timed animations,
 * both held still while it is paused or buffering. A new position, a pause or a new track remounts them (`key`), so
 * they never drift from what Home Assistant says.
 */
export function Progress({ head }: { head: PlayheadNow }) {
  return (
    <div className="mp-prog" role="img" aria-label={`${playTimeSpoken(head.at)} of ${playTimeSpoken(head.duration)}`}>
      <span className="mp-bar"><Fill head={head} /></span>
      <span className="mp-times" aria-hidden="true">
        <Clock head={head} />
        <span>{fmtPlayTime(head.duration)}</span>
      </span>
    </div>
  );
}

/**
 * How far in, set: the sheet's position as a groove slid along (spec/orb.md → One UI language), its clock on it, the
 * time played at its start and the length at its end, and the played part an ink tint, never the accent, since a
 * position is a fact, not an "on". It runs on as the readout does. While held its animations are off (`data-held`), so
 * the values drawn under them show the draft, and the time played is where it will play from, in the full ink; it
 * seeks once, when it is let go (`useSeek`).
 */
export function SeekGroove({ id, label, seek }: { id: string; label: string; seek: Seek }) {
  const { head, held, slider } = seek;
  return (
    <SliderTrack id={id} label={label} slider={{ ...slider, inset: 0 }} className="mp-seek" data-held={held || undefined}>
      {() => (
        <>
          <Fill head={head} className="mp-fill mp-seek-fill" />
          <span className="mp-seek-times" aria-hidden="true">
            <span className="mp-seek-at"><Clock head={head} /></span>
            <span>{fmtPlayTime(head.duration)}</span>
          </span>
        </>
      )}
    </SliderTrack>
  );
}

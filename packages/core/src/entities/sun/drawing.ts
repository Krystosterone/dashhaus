import { HORIZON } from "./position";
import type { SunHistory } from "./types";

/**
 * Today's path drawn as lines, for any skin: the day cut where the sun rises, sets and is now, each piece told by
 * what it is, so a skin draws the day it has had, the day still to come and the night apart. Points are fractions:
 * `x` of the day from local midnight, `y` of the drawing's height from its top.
 */
export type SunPathPart = "past" | "ahead" | "night";

export interface SunPathPiece {
  part: SunPathPart;
  points: Array<[number, number]>;
}

export interface SunPathDrawing {
  pieces: SunPathPiece[];
  /** Where the horizon is, from the top. */
  horizon: number;
  /** Where the sun is now. */
  sun: [number, number];
  /** Whether it is up now. */
  up: boolean;
}

/** How much room the path leaves above its peak and below its lowest, as a share of its height. */
const MARGIN = 0.08;

/**
 * Today's path as pieces of line, scaled so the day's peak meets the top and its lowest point the bottom, the horizon
 * between them. A day the sun never rises or sets is one piece, all night or all day.
 */
export function sunPathDrawing(day: SunHistory): SunPathDrawing {
  const steps = day.path.length - 1;
  const top = Math.max(day.peak, HORIZON + 10);
  const bottom = Math.min(...day.path, HORIZON - 10);
  const y = (elevation: number) => MARGIN + ((top - elevation) / (top - bottom)) * (1 - 2 * MARGIN);
  const at = (x: number) => {
    const i = Math.min(steps - 1, Math.floor(x * steps));
    const f = x * steps - i;
    return day.path[i] + (day.path[i + 1] - day.path[i]) * f;
  };

  // Every step, plus the points where it rises, sets and is now, so each piece ends exactly there.
  const cuts = [day.riseAt, day.setAt, day.nowAt].filter((x): x is number => x !== undefined);
  const xs = [...new Set([...day.path.map((_, i) => i / steps), ...cuts])].sort((a, b) => a - b);
  const partOf = (a: number, b: number): SunPathPart => {
    const mid = (a + b) / 2;
    if (at(mid) < HORIZON) return "night";
    return mid < day.nowAt ? "past" : "ahead";
  };

  const pieces: SunPathPiece[] = [];
  for (let i = 1; i < xs.length; i++) {
    const part = partOf(xs[i - 1], xs[i]);
    const point: [number, number] = [xs[i], y(at(xs[i]))];
    const last = pieces[pieces.length - 1];
    if (last?.part === part) last.points.push(point);
    else pieces.push({ part, points: [[xs[i - 1], y(at(xs[i - 1]))], point] });
  }

  const now = at(day.nowAt);
  return { pieces, horizon: y(HORIZON), sun: [day.nowAt, y(now)], up: now >= HORIZON };
}

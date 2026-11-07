import type { MediaPlayerEntity } from "./types";

/**
 * Where a player is in what it plays, worked out once and then left to run on its own, so nothing re-renders every
 * second: a card draws `at` and lets CSS move on from it while `running` (a fill that grows and a clock whose places
 * turn, each on its own timed animation started `at` seconds in).
 */
export interface Playhead {
  /** Seconds in, at the moment it was worked out. */
  at: number;
  /** Seconds long. */
  duration: number;
  /** It moves on by itself: playing, not paused or buffering. */
  running: boolean;
}

/**
 * Where it is at `now` (ms): its reported position, plus the time since Home Assistant read it while it plays, never
 * past its end or before its start. Nothing for a stream with no duration or a player that reports no position, and
 * nothing while it is off, asleep or unavailable: a card then draws no progress at all, never a guessed one. A
 * position with no `positionAt` is as of `now` (seeds).
 */
export function playhead(e: Pick<MediaPlayerEntity, "state" | "duration" | "position" | "positionAt">, now: number): Playhead | undefined {
  const { duration, position } = e;
  if (e.state === "unavailable" || e.state === "off" || e.state === "standby") return undefined;
  if (duration == null || !Number.isFinite(duration) || duration <= 0 || position == null || !Number.isFinite(position)) return undefined;
  const running = e.state === "playing";
  const since = running && e.positionAt != null ? Math.max(0, (now - e.positionAt) / 1000) : 0;
  return { at: Math.min(duration, Math.max(0, position + since)), duration, running };
}

/** How far in, 0–1, as a fill draws it. */
export const playedShare = (p: Playhead) => (p.duration > 0 ? Math.min(1, Math.max(0, p.at / p.duration)) : 0);

/**
 * One place of a running clock: a strip of `base` digits that turns one step every `period` seconds, and the digit it
 * shows at the start (`digit`). A card draws each as a strip of digits moved by a stepped transform animation lasting
 * `cycle` seconds, started `offset` seconds in (a negative delay), so the clock keeps time with no re-render.
 */
export interface ClockPlace {
  kind: "digit";
  base: 6 | 10;
  period: number;
  /** `period × base`: how long one turn of the strip takes. */
  cycle: number;
  /** Seconds into the current turn. */
  offset: number;
  digit: number;
}

/** A clock's places, left to right, digits and the colons between them. */
export type ClockPart = ClockPlace | { kind: "colon" };

const place = (at: number, base: 6 | 10, period: number): ClockPlace => {
  const cycle = period * base;
  const whole = Math.floor(at);
  const offset = whole % cycle;
  return { kind: "digit", base, period, cycle, offset, digit: Math.floor(offset / period) };
};

/**
 * The places a player's clock needs to count to `duration`, set at `at` seconds: `M:SS` under ten minutes, `MM:SS`
 * under an hour, `H:MM:SS` from an hour (to 9:59:59). The same places from the start of a track to its end, so the
 * clock never changes width as it counts.
 */
export function clockPlaces(at: number, duration: number): ClockPart[] {
  const t = Math.max(0, Math.min(at, duration));
  const colon = { kind: "colon" } as const;
  const seconds = [place(t, 6, 10), place(t, 10, 1)];
  if (duration >= 3600) return [place(t, 10, 3600), colon, place(t, 6, 600), place(t, 10, 60), colon, ...seconds];
  if (duration >= 600) return [place(t, 6, 600), place(t, 10, 60), colon, ...seconds];
  return [place(t, 10, 60), colon, ...seconds];
}

/** A playing time for a screen reader: "1 minute 23 seconds", "1 hour 2 minutes". */
export function playTimeSpoken(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const parts = [h && unit(h, "hour"), m && unit(m, "minute"), (s || (!h && !m)) && unit(s, "second")].filter(Boolean);
  return parts.join(" ");
}

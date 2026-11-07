import { fmtDuration } from "./format";

/**
 * Today's summary in words, the same on every card and in every skin: how long the entity spent in its state today,
 * or that it never did. The word is the state as the card says it ("on", "armed", "asleep", a climate's "heating"),
 * lower case. An unavailable entity's summary is each skin's own (orb says `unavailableSince`), so it isn't here.
 */
export const todaySummary = (word: string, minutes: number) =>
  minutes > 0 ? `${word.charAt(0).toUpperCase()}${word.slice(1)} ${fmtDuration(minutes)}` : `Not ${word} today`;

/** A reading's day before its first value: the strip's title already says today. */
export const NO_READINGS_TODAY = "No readings yet";

/**
 * A reading's day in words, the same on every card and in every skin: "Low 18.2° · High 21°", in the figures' own
 * format, or `NO_READINGS_TODAY` before its first.
 */
export const rangeSummary = (min: number | null | undefined, max: number | null | undefined, fmt: (value: number) => string) =>
  min == null || max == null ? NO_READINGS_TODAY : `Low ${fmt(min)} · High ${fmt(max)}`;

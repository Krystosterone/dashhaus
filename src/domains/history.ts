/** One sample per hour: 0 = nothing, 0-1 = intensity, "unavailable", or null for hours still ahead. */
export type HourSample = number | "unavailable" | null;

/** One measured reading per hour: a number, "unavailable", or null for hours ahead and before the first reading. */
export type Reading = number | "unavailable" | null;

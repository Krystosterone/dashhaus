/** One decimal, never "-0.0": a reading of -0.04 shows as 0.0. */
export const fmt1 = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return (r === 0 ? 0 : r).toFixed(1);
};

/** Minutes as a short duration: "54m", "3h", "11h 54m". Negative counts as none. */
export const fmtDuration = (m: number) => {
  const mins = Math.max(0, Math.round(m));
  const h = Math.floor(mins / 60), r = mins % 60;
  return h === 0 ? `${r}m` : r === 0 ? `${h}h` : `${h}h ${r}m`;
};

/** How long ago, in one unit so it fits a row's screen: "3m", "4h", "10d". Negative counts as none. */
export const fmtAgo = (m: number) => {
  const mins = Math.max(0, Math.floor(m));
  return mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;
};

/**
 * A Home Assistant name in words, for a state an integration names its own way: `connecting` → "Connecting",
 * `zone_cleaning` → "Zone cleaning"; `Max+` stays "Max+".
 */
export function inWords(raw: string): string {
  const spaced = raw.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase() : raw;
}

/**
 * A playing time on the clock a player shows, rounded down to the second: "0:05", "3:45", "12:09", "1:02:03". Hours
 * appear from an hour; minutes take two places beside them. Negative or not a number counts as none.
 */
export function fmtPlayTime(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

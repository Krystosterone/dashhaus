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

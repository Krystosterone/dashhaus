/**
 * A level that is a loudness or an output (a player's volume, a sound machine's), in words, the same on every card and
 * in every skin (spec/cards.md → What every card shows). It fills only while the output it sets sounds, active and
 * unmuted; unfilled, its words give the reason first, then the value, so an empty groove never reads as silence set
 * on purpose. Setting it never switches the output on or unmutes it.
 */

/** A volume's heading and caption. */
export const VOLUME = "Volume";

/**
 * A volume in words: "Volume 45%" while it sounds; with the reason it doesn't, that reason before the value:
 * "Off · 62%", "Muted · 45%", "Paused · 30%".
 */
export const volumeText = (percent: number, reason?: string) => (reason ? `${reason} · ${percent}%` : `${VOLUME} ${percent}%`);

/** A volume for a screen reader: "45 percent", or with the reason it doesn't sound, "62 percent, sound off". */
export const volumeSaid = (percent: number, reason?: string) => (reason ? `${percent} percent, ${reason}` : `${percent} percent`);

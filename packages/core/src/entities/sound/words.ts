import type { SoundEntity } from "./types";

/** Its state in words, the same on every card and in every skin: On, Off, or Unavailable while it is. */
export const soundWord = (e: Pick<SoundEntity, "state">) => (e.state === "unavailable" ? "Unavailable" : e.state === "on" ? "On" : "Off");

/** What it can do, in small print after when: "On / off, volume" with a volume, else "On / off". */
export const soundAbilities = (e: Pick<SoundEntity, "volume">) => (e.volume != null ? "On / off, volume" : "On / off");

/** Why its volume doesn't sound, before the value (`volumeText`): the off word while the sound is off; nothing while it plays. */
export const soundVolumeReason = (e: Pick<SoundEntity, "state">) => (e.state === "on" ? undefined : soundWord(e));

/** The same reason for a screen reader, after the figure (`volumeSaid`): "62 percent, sound off". */
export const SOUND_OFF_SAID = "sound off";

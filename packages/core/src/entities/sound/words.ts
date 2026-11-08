import type { SoundEntity } from "./types";

/** Its state in words, the same on every card and in every skin: On, Off, or Unavailable while it is. */
export const soundWord = (e: Pick<SoundEntity, "state">) => (e.state === "unavailable" ? "Unavailable" : e.state === "on" ? "On" : "Off");

/** What it can do, in small print after when: "On / off, volume" with a volume, else "On / off". */
export const soundAbilities = (e: Pick<SoundEntity, "volume">) => (e.volume != null ? "On / off, volume" : "On / off");

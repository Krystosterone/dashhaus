import { clockOf, hourCycleOf } from "./clock";
import type { HourCycle } from "./clock";

/**
 * What a card says about its picture (a camera's still, a player's artwork), the same on every card and in every skin.
 * Said on the status line or a meta line, never over the picture. An unavailable card says Unavailable, as every card
 * does, and draws no picture at all.
 */
export const PICTURE_WORDS = {
  /** A picture that failed to load with nothing to keep. */
  none: "No picture",
  /** What pressing a picture does, said after what it is, where its card names nothing better ("Open live view"). */
  open: "Open",
} as const;

/** A frame's time, "22:14" or "10:14 PM" on the dashboard's hour cycle, from when it loaded (`usePicture`'s `at`, epoch ms). */
export const pictureTime = (at: number, hourCycle: HourCycle = hourCycleOf()) => clockOf(new Date(at), hourCycle);

/** A still that isn't refreshing (a failed refresh, or a `quiet` dashboard): "Still from 22:14", or nothing. */
export const stillFrom = (at?: number, hourCycle: HourCycle = hourCycleOf()) => (at === undefined ? undefined : `Still from ${pictureTime(at, hourCycle)}`);

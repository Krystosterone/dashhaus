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

/** A frame's time, "22:14", from when it loaded (`usePicture`'s `at`, epoch ms). */
export const pictureTime = (at: number) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** A still that isn't refreshing (a failed refresh, or a `quiet` dashboard): "Still from 22:14", or nothing. */
export const stillFrom = (at?: number) => (at === undefined ? undefined : `Still from ${pictureTime(at)}`);

import { volumeText } from "../volume";
import type { MediaPlayerEntity, MediaPlayerState } from "./types";

/**
 * What a media player is doing, in words, the same on every card and in every skin. Buffering is the verb, never a
 * guessed end state; an `other` state is said in its own words (`stateText`).
 */
export const MEDIA_PLAYER_WORDS: Record<Exclude<MediaPlayerState, "other">, string> = {
  playing: "Playing",
  paused: "Paused",
  buffering: "Buffering",
  idle: "Idle",
  on: "On",
  standby: "Standby",
  off: "Off",
  unavailable: "Unavailable",
};

/** Today's word, lower case, as `todaySummary` takes it: "Playing 1h 20m", "Not playing today". */
export const MEDIA_PLAYER_TODAY = "playing";

/** Said where the volume would be while the sound is muted. */
export const MUTED = "Muted";

/** What it is doing in words: "Playing", "Standby"; an integration's own state as it says it ("Connecting"). */
export function mediaPlayerWord(e: Pick<MediaPlayerEntity, "state" | "stateText">): string {
  if (e.state === "unavailable") return MEDIA_PLAYER_WORDS.unavailable;
  if (e.stateText) return e.stateText;
  return e.state === "other" ? "Unknown" : MEDIA_PLAYER_WORDS[e.state];
}

/** It plays, or is about to: what a press pauses, and what today's hours count. Paused, idle and the rest are not. */
export const isPlaying = (e: Pick<MediaPlayerEntity, "state">) => e.state === "playing" || e.state === "buffering";

/**
 * It is active, the accent's "on", the LED and a bright figure: playing, buffering between tracks (so the accent
 * doesn't flicker), or on with nothing to play (a TV showing an input, whose press turns it off, as a light's does).
 * Paused, idle, standby, off and an integration's own state rest.
 */
export const isActive = (e: Pick<MediaPlayerEntity, "state">) => isPlaying(e) || e.state === "on";

/** It is off, or asleep in standby: nothing it was playing is still loaded, and a press turns it on. */
export const isOff = (e: Pick<MediaPlayerEntity, "state">) => e.state === "off" || e.state === "standby";

/** It can say what is loaded: on, and neither off nor asleep. */
const loaded = (e: Pick<MediaPlayerEntity, "state">) => e.state !== "unavailable" && !isOff(e);

/** What is playing, its title, while it has one: "Sunday Morning". */
export const mediaTitle = (e: Pick<MediaPlayerEntity, "state" | "title">) => (loaded(e) ? e.title : undefined);

/** Who it is by, while something is loaded: "Maroon 5". */
export const mediaArtist = (e: Pick<MediaPlayerEntity, "state" | "artist">) => (loaded(e) ? e.artist : undefined);

/**
 * What is playing in one line, the title first so a narrow card keeps it: "Sunday Morning · Maroon 5", the title or
 * the artist alone, else the app playing it ("Spotify"). Nothing while it is off, asleep, unavailable or has nothing.
 */
export function mediaLine(e: Pick<MediaPlayerEntity, "state" | "title" | "artist" | "app">): string | undefined {
  if (!loaded(e)) return undefined;
  const parts = [e.title, e.artist].filter((p): p is string => !!p?.trim());
  return parts.length ? parts.join(" · ") : e.app;
}

/** Where it plays from, for its details: the app, else the source ("Spotify", "TV"). Nothing while off. */
export function playingFrom(e: Pick<MediaPlayerEntity, "state" | "app" | "source">): string | undefined {
  if (!loaded(e)) return undefined;
  return e.app ?? e.source;
}

/**
 * What a player's one press does now, gated on what it supports: while it plays (or buffers), it pauses; while it is
 * paused, idle, on or in a state of its own, it plays; while it is off or asleep, it turns on. A player that is on and
 * can't do that, but turns off (a TV showing an input), turns off, as a light's press does. Null when it can do none
 * of these, or is unavailable: the card then shows its state with nothing to press.
 */
export type MediaPress = "play" | "pause" | "turnOn" | "turnOff";

export function mediaPress(e: Pick<MediaPlayerEntity, "state" | "supportsPlay" | "supportsPause" | "supportsTurnOn" | "supportsTurnOff">): MediaPress | null {
  if (e.state === "unavailable") return null;
  if (isOff(e)) return e.supportsTurnOn ? "turnOn" : null;
  const play = isPlaying(e) ? (e.supportsPause ? "pause" : null) : e.supportsPlay ? "play" : null;
  return play ?? (e.supportsTurnOff ? "turnOff" : null);
}

const PRESS_WORDS: Record<MediaPress, string> = { play: "Play", pause: "Pause", turnOn: "Turn on", turnOff: "Turn off" };

/** The press in words, as a key or a pill prints it: "Play", "Pause", "Turn on", "Turn off". */
export const pressWord = (press: MediaPress): string => PRESS_WORDS[press];

/** Its volume in words, for a status line or a meta line: "Volume 45%", "Muted"; nothing where it doesn't say. */
export function volumeWord(e: Pick<MediaPlayerEntity, "state" | "volume" | "muted">): string | undefined {
  if (!loaded(e)) return undefined;
  if (e.muted) return MUTED;
  return e.volume == null ? undefined : volumeText(e.volume);
}

/**
 * Why its volume doesn't sound now, said before the value (`volumeText`): `Muted`, or the state's word while it isn't
 * active (`Paused`, `Idle`); nothing while it plays, buffers or is on, the only time its groove or fader fills.
 */
export function volumeReason(e: Pick<MediaPlayerEntity, "state" | "stateText" | "muted">): string | undefined {
  if (loaded(e) && e.muted) return MUTED;
  return isActive(e) ? undefined : mediaPlayerWord(e);
}

/** Its skip keys and pills, in words: "Previous", "Next". */
export const SKIP_WORDS = { previous: "Previous", next: "Next" } as const;

/** A skip said in full for a screen reader: "Kitchen speaker: previous track". */
export const skipSaid = (name: string, which: keyof typeof SKIP_WORDS) => `${name}: ${which} track`;

/** What its artwork is, said for it: "Artwork for Sunday Morning", or "Kitchen speaker artwork" with no title. */
export function artworkLabel(e: Pick<MediaPlayerEntity, "state" | "title" | "name">): string {
  const title = mediaTitle(e);
  return title ? `Artwork for ${title}` : `${e.name} artwork`;
}

/** What the seek control is, its legend or its spoken name: "Position". */
export const POSITION = "Position";

/**
 * What it can do, for the end of its details' small print: "Skip, seek, volume, mute, 4 sources"; "Play and pause"
 * alone; "View only" with nothing to press.
 */
export function mediaAbilities(e: Pick<MediaPlayerEntity, "supportsPlay" | "supportsPause" | "supportsPrevious" | "supportsNext" | "supportsSeek" | "supportsVolume" | "supportsMute" | "supportsSource" | "sources" | "supportsTurnOn" | "supportsTurnOff">): string {
  const parts = [
    (e.supportsPrevious || e.supportsNext) && "skip",
    e.supportsSeek && "seek",
    e.supportsVolume && "volume",
    e.supportsMute && "mute",
    e.supportsSource && e.sources?.length && (e.sources.length === 1 ? "1 source" : `${e.sources.length} sources`),
  ].filter((p): p is string => !!p);
  if (!parts.length) {
    const plays = e.supportsPlay || e.supportsPause;
    const power = e.supportsTurnOn || e.supportsTurnOff;
    return plays ? "Play and pause" : power ? "On and off" : "View only";
  }
  const text = parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

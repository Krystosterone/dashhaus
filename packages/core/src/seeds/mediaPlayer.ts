import { useMemo, useState } from "react";
import type { HourSample } from "../entities/history";
import type { MediaPlayerEntity, MediaPlayerHistory } from "../entities/mediaPlayer/types";
import { ARTWORK_SUNDAY, ARTWORK_TALL, ARTWORK_TIDES } from "./pictures";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const NOW = { hour: 11, minute: 54 };
const stamp = `${NOW.hour}:${String(NOW.minute).padStart(2, "0")}`;

export interface MediaPlayerSeed {
  /** A position is as of when the story draws it (no `positionAt`), so its clock starts where the seed says. */
  entity: MediaPlayerEntity;
  /** Hours 0 to NOW.hour - 1: share of each hour it was playing. */
  past: HourSample[];
}

/** A speaker that does everything Home Assistant names: play, pause, skip, volume, mute, three sources, on and off. */
const FULL = {
  supportsPlay: true, supportsPause: true, supportsPrevious: true, supportsNext: true, supportsVolume: true,
  supportsMute: true, supportsSource: true, supportsTurnOn: true, supportsTurnOff: true,
} as const;
const SOURCES = ["Spotify", "Radio", "TV"];
const full = () => ({ ...FULL, sources: [...SOURCES] });
/** Breakfast radio, 07:00 to 08:30, then the morning's music from 10:00. */
const MORNING: HourSample[] = [0, 0, 0, 0, 0, 0, 0, 1, 0.5, 0, 0.75];

export const MEDIA_PLAYER_SEEDS = {
  /** Playing, with its artwork: the accent, its position ticking, and a press pauses it. It seeks, in its details. */
  playing: {
    entity: {
      entityId: "media_player.kitchen", name: "Kitchen speaker", area: "Kitchen", state: "playing", ...full(), supportsSeek: true,
      title: "Sunday Morning", artist: "Maroon 5", album: "Songs About Jane", app: "Spotify", source: "Spotify",
      duration: 245, position: 83, volume: 45, muted: false, picture: ARTWORK_SUNDAY, lastChanged: "11:40",
    },
    past: MORNING,
  },
  /** Paused part way: the clock holds, and a press plays it. */
  paused: {
    entity: {
      entityId: "media_player.living_room", name: "Living room", area: "Living room", state: "paused", ...full(),
      title: "Tides", artist: "Ólafur Arnalds", album: "Some Kind of Peace", source: "Spotify",
      duration: 312, position: 140, volume: 30, picture: ARTWORK_TIDES, lastChanged: "11:31",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 1],
  },
  /** Buffering the next track: the verb, never a guessed end; it is on its way to playing, so still the accent. */
  buffering: {
    entity: {
      entityId: "media_player.study", name: "Study speaker", area: "Study", state: "buffering", ...full(),
      title: "Weightless", artist: "Marconi Union", source: "Spotify", duration: 480, position: 0, volume: 20, lastChanged: "11:53",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
  },
  /** Muted while it plays: said where the volume would be. */
  muted: {
    entity: {
      entityId: "media_player.dining_room", name: "Dining room", area: "Dining room", state: "playing", ...full(),
      title: "So What", artist: "Miles Davis", album: "Kind of Blue", source: "Spotify",
      duration: 562, position: 401, volume: 60, muted: true, picture: ARTWORK_TIDES, lastChanged: "11:45",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5],
  },
  /** A radio stream: a title and no duration, so no progress is drawn, never a guessed one. */
  stream: {
    entity: {
      entityId: "media_player.bathroom", name: "Bathroom radio", area: "Bathroom", state: "playing", ...full(),
      title: "BBC Radio 6 Music", source: "Radio", volume: 35, lastChanged: "07:02",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  },
  /** A web radio that stops but can't hold its place (`STOP`, no `PAUSE`): a press stops it, as Home Assistant's player does. */
  stops: {
    entity: {
      entityId: "media_player.workshop_radio", name: "Workshop radio", area: "Workshop", state: "playing", ...full(), supportsPause: false, supportsStop: true,
      title: "CBC Radio One", source: "Radio", volume: 50, lastChanged: "08:15",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  },
  /**
   * An IR TV Home Assistant sends to but never hears back from (`assumed_state`): it shows on, and may not be. It turns
   * on and off, steps its volume and mutes.
   */
  assumed: {
    entity: {
      entityId: "media_player.bedroom_tv", name: "Bedroom TV", area: "Bedroom", state: "on", assumedState: true,
      supportsTurnOn: true, supportsTurnOff: true, supportsVolumeStep: true, supportsMute: true, lastChanged: "21:40",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  /** On with nothing loaded: a press plays. */
  idle: {
    entity: { entityId: "media_player.hall", name: "Hall speaker", area: "Hall", state: "idle", ...full(), source: "Spotify", volume: 25, lastChanged: "09:05" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0.1, 0],
  },
  /** A TV that is on, showing an input with nothing it reports as playing. */
  on: {
    entity: {
      entityId: "media_player.den_tv", name: "Den TV", area: "Den", state: "on",
      supportsTurnOn: true, supportsTurnOff: true, supportsVolume: true, supportsMute: true, supportsSource: true,
      sources: ["HDMI 1", "HDMI 2", "Live TV", "Netflix", "YouTube"], source: "HDMI 1", volume: 18, lastChanged: "11:10",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  /** A TV over CEC, on: it steps its volume and mutes, but reports no level, so its details step it rather than set it. */
  steps: {
    entity: {
      entityId: "media_player.living_room_tv", name: "Living room TV", area: "Living room", state: "on",
      supportsTurnOn: true, supportsTurnOff: true, supportsVolumeStep: true, supportsMute: true, muted: false, supportsSource: true,
      sources: ["HDMI 1", "HDMI 2", "Live TV"], source: "HDMI 2", lastChanged: "10:48",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  /** Asleep: a press turns it on. */
  standby: {
    entity: { entityId: "media_player.bedroom_tv", name: "Bedroom TV", area: "Bedroom", state: "standby", supportsTurnOn: true, supportsTurnOff: true, lastChanged: "07:15" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  off: {
    entity: { entityId: "media_player.office", name: "Office speaker", area: "Office", state: "off", ...full(), lastChanged: "08:30" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0],
  },
  /** A state Home Assistant doesn't name, from its integration: said in its own words. */
  other: {
    entity: { entityId: "media_player.garden", name: "Garden speaker", area: "Garden", state: "other", stateText: "Connecting", ...full(), volume: 50, lastChanged: "11:52" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  unavailable: {
    entity: { entityId: "media_player.garage", name: "Garage radio", area: "Garage", state: "unavailable", ...full(), lastSeen: "08:20" },
    past: [0, 0, 0, 0, 0, 0, 0, 0, "unavailable", "unavailable", "unavailable"],
  },
  /** Worst case: a long name, area, title, artist and album on an hour-long track, its art not square (break-ui skill). */
  long: {
    entity: {
      entityId: "media_player.upstairs_landing", name: "Upstairs landing speaker by the nursery door", area: "Primary bedroom en-suite and walk-in closet", state: "playing", ...full(),
      title: "Concerto for Two Violins, Strings and Continuo in D minor, BWV 1043: I. Vivace (Live at the Wigmore Hall)",
      artist: "Academy of St Martin in the Fields, Joshua Bell and Sir Neville Marriner", album: "Bach: Violin Concertos, Double Concerto and Sinfonia (Remastered 2024 Deluxe Edition)",
      source: "Spotify", duration: 4271, position: 3599, volume: 100, picture: ARTWORK_TALL, lastChanged: "Fri 18:30",
    },
    past: Array<HourSample>(11).fill(1),
  },
} satisfies Record<string, MediaPlayerSeed>;

export type MediaPlayerSeedName = keyof typeof MEDIA_PLAYER_SEEDS;

/*
 * Worst-case data: values real Home Assistant installs produce. Long everything on an hour-long track with art that
 * isn't square; a seekable track as long as a clock goes (9:59:59); a stream in another language with no duration and no
 * artwork; a one-letter player that says nothing and supports nothing, playing; a player with every feature off,
 * paused; a receiver zone that only steps its volume, muted with no level; a TV whose source list runs long; an
 * integration's own long state; and a long name gone and never seen. Every skin's Worst case story draws these.
 */
export const MEDIA_PLAYER_WORST_CASE: MediaPlayerSeed[] = [
  MEDIA_PLAYER_SEEDS.long,
  { // Seekable, the longest clock a player draws (9:59:59), late in it: H:MM:SS on a narrow groove or fader
    entity: {
      entityId: "media_player.audiobook", name: "Audiobook", area: "Bedroom", state: "playing", ...full(), supportsSeek: true,
      title: "War and Peace", artist: "Leo Tolstoy", source: "Spotify", duration: 35999, position: 35400, volume: 25, lastChanged: "06:40",
    },
    past: Array<HourSample>(11).fill(1),
  },
  { // Accented, long, a stream: no duration, no artwork
    entity: {
      entityId: "media_player.salle_de_sejour", name: "Enceinte – salle de séjour et coin repas", area: "Rez-de-chaussée, côté jardin d'hiver", state: "playing", ...full(),
      title: "France Culture – Les Chemins de la philosophie, émission spéciale en direct", artist: "Radio France", source: "Radio", volume: 0, lastChanged: "23:58",
    },
    past: Array<HourSample>(11).fill(1),
  },
  { // One letter, no area, no features, nothing read today, playing with nothing it says
    entity: { entityId: "media_player.x", name: "X", state: "playing" },
    past: Array<HourSample>(11).fill(null),
  },
  { // Every feature off: paused with a title and a position, and nothing to press
    entity: {
      entityId: "media_player.wohnzimmer", name: "Wohnzimmer-Lautsprecher", area: "Wohnzimmer", state: "paused",
      title: "Die Moldau", artist: "Wiener Philharmoniker", duration: 754, position: 754, volume: 70, lastChanged: "Mon 06:12",
    },
    past: [0, 0, 0, 0, 0, 0, 1, 0.2, 0, 0, 0],
  },
  { // Steps its volume with no level reported, muted, playing: `Muted` beside its steps, never an invented figure
    entity: {
      entityId: "media_player.receiver_zone_2", name: "Receiver zone 2 – patio and outdoor kitchen", area: "Patio", state: "playing",
      supportsPlay: true, supportsPause: true, supportsVolumeStep: true, supportsMute: true, muted: true, title: "Radio Paradise", lastChanged: "09:12",
    },
    past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
  },
  { // A receiver with a long list of inputs, idle
    entity: {
      entityId: "media_player.av_receiver", name: "AV receiver", area: "Living room", state: "idle", ...full(),
      sources: ["AirPlay", "Bluetooth", "CBL/SAT", "CD", "DVD/Blu-ray", "Game", "HDMI 7 (front panel)", "Media Player", "Network", "Phono", "Tuner", "TV Audio", "USB/iPod"],
      source: "HDMI 7 (front panel)", volume: 38, lastChanged: "10:02",
    },
    past: Array<HourSample>(11).fill(0),
  },
  { // An integration's own state at length, with the player's media still known
    entity: { entityId: "media_player.firmware", name: "Kitchen speaker", area: "Kitchen", state: "other", stateText: "Updating firmware, do not unplug", supportsTurnOff: true, lastChanged: "11:53" },
    past: Array<HourSample>(11).fill(0),
  },
  { // Gone with its long name, never seen: "Last seen unknown" and the dashed slot at length
    entity: { entityId: "media_player.upstairs_landing_2", name: "Upstairs landing speaker by the nursery door", area: "Primary bedroom en-suite and walk-in closet", state: "unavailable" },
    past: Array<HourSample>(11).fill("unavailable"),
  },
];

/** A position as of now, so a seed's clock carries on from where a pause left it. */
const settle = (e: MediaPlayerEntity, at: number): MediaPlayerEntity => {
  if (e.position == null || e.state !== "playing") return e;
  const since = e.positionAt == null ? 0 : (at - e.positionAt) / 1000;
  return { ...e, position: Math.min(e.duration ?? Infinity, e.position + Math.max(0, since)), positionAt: at };
};

/** The tracks a demo skips through: the seed's own first, then these. */
const TRACKS = [
  { title: "Sunday Morning", artist: "Maroon 5", album: "Songs About Jane", duration: 245, picture: ARTWORK_SUNDAY },
  { title: "Tides", artist: "Ólafur Arnalds", album: "Some Kind of Peace", duration: 312, picture: ARTWORK_TIDES },
  { title: "Holocene", artist: "Bon Iver", album: "Bon Iver, Bon Iver", duration: 337, picture: undefined },
];

/**
 * Local state that behaves like a `media_player` entity, for stories and prototypes: play and pause (the clock
 * carries on from where it was), skip, volume, mute, source, on and off.
 */
export function useDemoMediaPlayer(seed: MediaPlayerSeed) {
  const [entity, setEntity] = useState<MediaPlayerEntity>(() => (seed.entity.position != null ? { ...seed.entity, positionAt: Date.now() } : seed.entity));
  const history = useMemo<MediaPlayerHistory>(() => {
    const playing = entity.state === "playing" || entity.state === "buffering";
    const now: HourSample = entity.state === "unavailable" ? "unavailable" : playing ? 0.9 : 0;
    const samples: HourSample[] = [...seed.past, now, ...Array(24 - seed.past.length - 1).fill(null)];
    const pastMin = seed.past.reduce<number>((a, x) => a + (typeof x === "number" ? Math.round(x * 60) : 0), 0);
    return { samples, currentHour: NOW.hour, playingMinutes: pastMin + (playing ? NOW.minute : 0) };
  }, [entity, seed.past]);

  const change = (when: (e: MediaPlayerEntity) => boolean | undefined, next: (e: MediaPlayerEntity, at: number) => MediaPlayerEntity) =>
    setEntity((e) => (e.state === "unavailable" || !when(e) ? e : next(settle(e, Date.now()), Date.now())));
  const go = (state: MediaPlayerEntity["state"]) => (e: MediaPlayerEntity, at: number): MediaPlayerEntity => ({
    ...e, state, stateText: undefined, lastChanged: e.state === state ? e.lastChanged : stamp, ...(e.position != null && { positionAt: at }),
  });
  const skip = (by: number) => (e: MediaPlayerEntity, at: number): MediaPlayerEntity => {
    const index = TRACKS.findIndex((t) => t.title === e.title);
    const track = TRACKS[(index + by + TRACKS.length) % TRACKS.length];
    return { ...e, ...track, position: 0, positionAt: at };
  };

  return {
    entity,
    history,
    onPlay: () => change((e) => e.supportsPlay, go("playing")),
    onPause: () => change((e) => e.supportsPause, go("paused")),
    onStop: () => change((e) => e.supportsStop, go("idle")),
    onPrevious: () => change((e) => e.supportsPrevious, (e, at) => ((e.position ?? 0) > 3 ? { ...e, position: 0, positionAt: at } : skip(-1)(e, at))),
    onNext: () => change((e) => e.supportsNext, skip(1)),
    onTurnOn: () => change((e) => e.supportsTurnOn, go("idle")),
    onTurnOff: () => change((e) => e.supportsTurnOff, go("off")),
    onVolumeChange: (volume: number) => change((e) => e.supportsVolume, (e) => ({ ...e, volume: Math.round(Math.min(100, Math.max(0, volume))) })),
    /** One volume step, ten points where a level is reported; with none, it steps and nothing it reports changes. */
    onVolumeUp: () => change((e) => e.supportsVolumeStep || e.supportsVolume, (e) => (e.volume == null ? e : { ...e, volume: Math.min(100, e.volume + 10) })),
    onVolumeDown: () => change((e) => e.supportsVolumeStep || e.supportsVolume, (e) => (e.volume == null ? e : { ...e, volume: Math.max(0, e.volume - 10) })),
    /** Seeks where it plays something with a length, its clock running on from there; answers whether it took it. */
    onSeek: async (seconds: number) => {
      const takes = (e: MediaPlayerEntity) => e.supportsSeek && e.duration != null && e.position != null && Number.isFinite(seconds);
      if (entity.state === "unavailable" || !takes(entity)) return false;
      change(takes, (e, at) => ({ ...e, position: Math.min(e.duration!, Math.max(0, seconds)), positionAt: at }));
      return true;
    },
    onMuteChange: (muted: boolean) => change((e) => e.supportsMute, (e) => ({ ...e, muted })),
    onSourceChange: (source: string) => change((e) => e.supportsSource && e.sources?.includes(source), (e) => ({ ...e, source })),
  };
}

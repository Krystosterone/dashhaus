import { useMemo, useRef, useState } from "react";
import { playTimeSpoken } from "../entities/mediaPlayer/position";
import type { PlayheadNow } from "./usePlayhead";

/** A seek's step, in seconds: one key or assistive swipe. Page keys move ten. */
export const SEEK_STEP = 5;

/** What a seek control slides: `useSlider`'s options, as a track or a fader takes them. */
export interface SeekSlider {
  /** Where the position is as drawn. */
  value: number;
  min: 0;
  max: number;
  step: typeof SEEK_STEP;
  /** What a screen reader hears for a position: "2 minutes 31 seconds of 4 minutes 5 seconds". */
  valueText: (seconds: number) => string;
  /** The draft, on every move: drawn, not sent. */
  onChange: (seconds: number) => void;
  /** Where the gesture ended: sent once. */
  onCommit: (seconds: number) => void;
  /** Where the position is now, as it runs on: keys step from it. */
  current: () => number;
}

export interface Seek {
  /**
   * The playhead to draw: the draft while held (still), the seek once let go (running on from where it was let go,
   * under a key of its own) until Home Assistant reports or refuses it, else Home Assistant's.
   */
  head: PlayheadNow;
  /**
   * A finger or a key is on it: the running animations are switched off (a skin's `data-held`), so the values drawn
   * under them show the draft, held still. Nothing remounts as it moves.
   */
  held: boolean;
  /** While held, the position it will play from, in seconds. */
  target?: number;
  slider: SeekSlider;
}

interface Pending {
  at: number;
  /** When it was let go, in ms. */
  since: number;
  /** Home Assistant's key at release: when it changes, Home Assistant has reported, and its truth is drawn. */
  from: string;
  id: number;
}

const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));

/**
 * A player's seek, for a skin's seek control (spec/cards.md → Using the media player card): the position slides as a
 * draft while held, and seeks once, when it is let go (`onSeek`). After that the line runs on from where it was let go,
 * under a new key, until Home Assistant reports the entity again (its key changes) or `onSeek` answers `false`: no snap
 * back and no timeout. Nothing re-renders on a timer: once per move while held, once at release, once when Home
 * Assistant reports.
 *
 * Nothing without a playhead (a stream, a player off, the dashboard's `quiet`) or without `onSeek`: the card then draws
 * its readout. The card gates on what the player supports.
 */
export function useSeek(head: PlayheadNow | undefined, onSeek?: (seconds: number) => void | Promise<boolean>): Seek | undefined {
  const [draft, setDraft] = useState<number | undefined>(undefined);
  const [pending, setPending] = useState<Pending | undefined>(undefined);
  const ids = useRef(0);
  const live = head && pending?.from === head.key ? pending : undefined;
  const base = useMemo<PlayheadNow | undefined>(() => {
    if (!head || !live) return head;
    // Let go: it plays on from there as of release, as Home Assistant's would.
    const since = head.running ? Math.max(0, (Date.now() - live.since) / 1000) : 0;
    return { at: clamp(live.at + since, head.duration), duration: head.duration, running: head.running, key: `seek|${live.at}|${live.since}` };
  }, [head, live]);
  // When what is drawn was worked out, so a key steps from where it is now.
  const baseKey = base?.key;
  const drawnAt = useMemo(() => (baseKey == null ? 0 : Date.now()), [baseKey]);
  if (!head || !base || !onSeek) return undefined;

  const held = draft != null;
  const shown: PlayheadNow = held ? { at: clamp(draft, base.duration), duration: base.duration, running: false, key: base.key } : base;
  const release = (seconds: number) => {
    const at = clamp(seconds, head.duration);
    const id = ++ids.current;
    setDraft(undefined);
    setPending({ at, since: Date.now(), from: head.key, id });
    void Promise.resolve(onSeek(at)).then((taken) => {
      if (taken === false) setPending((p) => (p?.id === id ? undefined : p));
    });
  };
  return {
    head: shown,
    held,
    ...(held && { target: shown.at }),
    slider: {
      value: shown.at,
      min: 0,
      max: base.duration,
      step: SEEK_STEP,
      valueText: (s) => `${playTimeSpoken(s)} of ${playTimeSpoken(base.duration)}`,
      onChange: setDraft,
      onCommit: release,
      current: () => (held || !shown.running ? shown.at : clamp(shown.at + (Date.now() - drawnAt) / 1000, shown.duration)),
    },
  };
}

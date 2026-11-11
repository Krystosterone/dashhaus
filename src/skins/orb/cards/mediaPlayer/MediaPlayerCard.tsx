import type { MediaPlayerEntity, MediaPlayerHistory } from "@dashhaus/core/entities/mediaPlayer/types";
import { MEDIA_PLAYER_TODAY, MUTED, OPEN_IN_HOME_ASSISTANT, POSITION, SKIP_WORDS, artworkLabel, isActive, isOff, mediaAbilities, mediaArtist, mediaLine, mediaPlayerWord, mediaPress, mediaTitle, openInHomeAssistantSaid, playingFrom, pressWord, skipSaid, VOLUME_STEP_WORDS, volumeBySteps, volumeReason, volumeStepSaid, volumeStepValue } from "@dashhaus/core/entities/mediaPlayer/words";
import type { MediaPress } from "@dashhaus/core/entities/mediaPlayer/words";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { VOLUME, volumeSaid, volumeText } from "@dashhaus/core/entities/volume";
import { usePicture, usePlayhead, useSeek } from "@dashhaus/core/hooks";
import { MediaPlayerIcon } from "./icons";
import { Progress, SeekGroove } from "./parts";
import { CardFrame, ChoiceChips, LevelBar, Picture, Said, SheetBlock, Today, TogglePill, detailsSheet, paint, timed, useCard } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./MediaPlayerCard.css";

export interface MediaPlayerCardProps extends CardProps {
  entity: MediaPlayerEntity;
  /** Today's playing: shown in the sheet. */
  history?: MediaPlayerHistory;
  /** Play: the orb and the pill, while it is paused, idle or on. */
  onPlay?: () => void;
  /** Pause: the orb and the pill, while it plays. */
  onPause?: () => void;
  /** Stops it, what a press does while it plays for a player that stops but doesn't pause (`mediaPress`). */
  onStop?: () => void;
  /** Sheet: skip back. */
  onPrevious?: () => void;
  /** Sheet: skip on. */
  onNext?: () => void;
  /** Turn it on: the orb and the pill, while it is off or asleep. */
  onTurnOn?: () => void;
  /** Sheet: turn it off; the orb and the pill where it is on and can neither play nor pause (a TV showing an input). */
  onTurnOff?: () => void;
  /** Sheet: the volume groove, as a percent. */
  onVolumeChange?: (percent: number) => void;
  /**
   * Sheet: the position groove, in seconds, sent once when it is let go; `false` (refused) draws Home Assistant's
   * position again.
   */
  onSeek?: (seconds: number) => void | Promise<boolean>;
  /** Sheet: the volume's Up pill, one step, for a player that steps its volume rather than sets it. */
  onVolumeUp?: () => void;
  /** Sheet: the volume's Down pill. */
  onVolumeDown?: () => void;
  /** Sheet: the mute chips, Off or On. */
  onMuteChange?: (muted: boolean) => void;
  /** Sheet: the source chips. */
  onSourceChange?: (source: string) => void;
  /**
   * Nothing on it runs by itself (the dashboard's `quiet`): no progress line and no clock, since a held one would lie
   * and a running one changes on its own.
   */
  quiet?: boolean;
  /**
   * Open Home Assistant's own player for it: inside Home Assistant, its more-info dialog (`useHaMoreInfo`), which
   * browses media, groups players and sets the sound mode. The sheet carries an Open in Home Assistant pill to it, last
   * among its controls; without one (a story, a standalone app) there is none.
   */
  onOpenMore?: () => void;
}

const ON_OFF = [{ value: "off", label: "Off" }, { value: "on", label: "On" }] as const;

/**
 * A media player (one `media_player.*`): what is playing, and the one press that plays, pauses or turns it on, gated
 * on what it supports; the pill says which. Playing (or buffering, or on) is the accent; a state, so it never glows. The status line
 * says what is playing, the title first. Featured, it shows the artwork, the title and artist, and how far in, a line
 * and a clock that run on by themselves with no re-render. The name, or a press and hold, opens the sheet: the same,
 * with how far in as a groove that seeks where the player can, skip back and on, the volume groove the sound card has
 * (or Down and Up for a player that steps its volume), mute, the source, turning it off, inside Home Assistant a pill
 * to its own player (browsing media, grouping), and today's playing. Its artwork is data, never a signal: no glow,
 * never in a row, never inside the orb.
 */
export function MediaPlayerCard({ entity: e, history, variant, footprint, showControl, onPlay, onPause, onStop, onPrevious, onNext, onTurnOn, onTurnOff, onVolumeChange, onSeek, onVolumeUp, onVolumeDown, onMuteChange, onSourceChange, quiet, onOpenMore, onOpenDetails, onClose }: MediaPlayerCardProps) {
  const card = useCard("mp", { variant, footprint, showControl, area: e.area });
  const { uid, sheet, featured, area } = card;
  const unav = e.state === "unavailable";
  // Playing, buffering between tracks, or on with nothing to play: the accent's "on" (spec/cards.md → Media player).
  const active = isActive(e);
  // A state: being active is the accent, with no glow. A player is not light, heat or daylight (attention-budget skill).
  const colors = paint("state", 0);
  const word = mediaPlayerWord(e);

  // The one press, where the player supports it and the card was given its handler.
  const handlers: Record<MediaPress, (() => void) | undefined> = { play: onPlay, pause: onPause, stop: onStop, turnOn: onTurnOn, turnOff: onTurnOff };
  const viewOnly = !onPlay && !onPause && !onStop && !onTurnOn && !onTurnOff;
  const wanted = mediaPress(e);
  const press = wanted && handlers[wanted] ? wanted : null;
  const verb = press ? pressWord(press) : undefined;
  const run = () => { if (press) handlers[press]?.(); };

  const line = mediaLine(e);
  const muted = !unav && !isOff(e) && e.muted === true;
  // Why the volume doesn't sound now (Muted, Paused, Idle), or nothing while it does.
  const quietVolume = volumeReason(e);
  // Featured and the sheet show what is playing under the head, so their status line says where it plays from.
  const roomy = featured || sheet;
  const from = playingFrom(e);
  // With nothing of its own to say, the status line says since when, never the state word the slot already shows
  // (spec/orb.md → One state vocabulary); unavailable, it says so, as every card does.
  const since = unav ? word : sinceFact(e.lastChanged);
  const cue = line ?? area ?? since;
  const roomyLine = [area, from].filter(Boolean).join(" · ") || (line ?? since ?? "");
  // Under 260 px the pill says only what a press does, so the line leads with the state it dropped.
  const said = (rest: boolean) => press && <Said word={word} rest={rest} />;
  const status = roomy
    ? <>{said(!!roomyLine)}{timed(roomyLine)}</>
    : <>{said(!!cue || muted)}{timed(cue)}{muted && <span className="mp-muted">{cue ? " · " : ""}{MUTED}</span>}</>;

  const orbLabel = unav ? `${e.name}: Unavailable` : verb ? `${verb} ${e.name}` : `${e.name}: ${word}`;
  const slot = press
    ? <TogglePill label={`${e.name}: ${word} · ${verb}`} on={active} onToggle={run} action={verb}>{word}</TogglePill>
    : <p className="hd-st mp-st">{word}</p>;

  const playhead = usePlayhead(e);
  const head = quiet ? undefined : playhead;
  const title = mediaTitle(e);
  const artist = mediaArtist(e);
  const loaded = !unav && !isOff(e);
  // The artwork is asked for only where its well is drawn: featured and the sheet, while something is loaded.
  const art = usePicture(roomy && loaded ? e.picture : undefined);
  // Seek in the sheet only, never on the card's face, where a stray tap would jump the track; with no line to seek
  // along (a stream, quiet), none (spec/cards.md → Using the media player card).
  const seek = useSeek(sheet && loaded && e.supportsSeek ? head : undefined, onSeek);
  const nowPlaying = roomy && loaded && (title || artist || (head && !seek) || e.picture);

  const can = {
    previous: loaded && e.supportsPrevious && !!onPrevious,
    next: loaded && e.supportsNext && !!onNext,
    off: !unav && !isOff(e) && e.supportsTurnOff && !!onTurnOff && press !== "turnOff",
    volume: loaded && e.supportsVolume && e.volume != null && !!onVolumeChange,
    // A player that steps its volume rather than sets it: Down and Up, each one step, in place of the groove.
    steps: loaded && volumeBySteps(e) && !!onVolumeUp && !!onVolumeDown,
    mute: loaded && e.supportsMute && !!onMuteChange,
    source: loaded && e.supportsSource && (e.sources?.length ?? 0) > 0 && !!onSourceChange,
    // Home Assistant's own player, where the host has it (never in a story or a standalone app): not while unavailable.
    more: !unav && !!onOpenMore,
  };
  const stepValue = volumeStepValue(e);

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, ...colors }}
      orb={viewOnly ? undefined : { label: orbLabel, pressed: active, intensity: 0, onToggle: run, children: <MediaPlayerIcon /> }}
      glyph={viewOnly ? <MediaPlayerIcon /> : undefined}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails && (() => onOpenDetails())}
      status={status}
      statusTitle={typeof status === "string" ? status : cue}
      value={word}
      // The large readout is the volume, which no card control prints, or Muted; without one it repeats the pill's word.
      readout={unav ? { value: null } : muted ? { value: MUTED, duplicate: true, word: true, className: "hd-num--long" } : loaded && e.volume != null ? { value: <>{e.volume}<span>%</span></> } : { value: word, duplicate: true, word: true, className: "hd-num--long" }}
      onClose={onClose}
      control={slot}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: unav ? "" : mediaAbilities(e) }}
    >
      {nowPlaying && (
        <div className="mp-now" data-art={e.picture ? "" : undefined}>
          {e.picture && (
            <Picture picture={art} label={artworkLabel(e)} ratio="1 / 1">
              <MediaPlayerIcon />
            </Picture>
          )}
          <div className="mp-meta">
            {title && <p className="mp-title" title={title}>{title}</p>}
            {artist && <p className="mp-artist" title={artist}>{artist}</p>}
            {sheet && e.album && <p className="mp-album" title={e.album}>{e.album}</p>}
            {head && !seek && <Progress head={head} />}
          </div>
        </div>
      )}
      {(seek || can.previous || can.next || can.off || can.volume || can.steps || can.mute || can.source || can.more) && (
        <SheetBlock>
          {seek && <SeekGroove id={`${uid}-pos`} label={`${e.name} ${POSITION.toLowerCase()}`} seek={seek} />}
          {(can.previous || can.next) && (
            <div className="hd-acts">
              {can.previous && <TogglePill label={skipSaid(e.name, "previous")} onToggle={onPrevious!}>{SKIP_WORDS.previous}</TogglePill>}
              {can.next && <TogglePill label={skipSaid(e.name, "next")} onToggle={onNext!}>{SKIP_WORDS.next}</TogglePill>}
            </div>
          )}
          {can.volume && (
            <LevelBar
              id={`${uid}-vol`}
              heading={VOLUME}
              value={e.volume!}
              min={0}
              max={100}
              // A loudness fills only while it sounds, active and unmuted; unfilled, its words say why first
              // (spec/cards.md → What every card shows).
              on={!quietVolume}
              text={(pct) => `${pct}%`}
              offText={(pct) => volumeText(pct, quietVolume)}
              valueText={(v) => volumeSaid(v, quietVolume?.toLowerCase())}
              onChange={onVolumeChange!}
            />
          )}
          {can.steps && (
            // Two raised pills that act once, under the volume's heading and what it says (a level where one is
            // reported, else Muted or nothing): a step is a tap, never a groove that would claim a level.
            <div className="hd-blk" role="group" aria-labelledby={`${uid}-vs`}>
              <p className="hd-blk-h" id={`${uid}-vs`}><span>{VOLUME}</span>{stepValue && <span className="hd-blk-v">{stepValue}</span>}</p>
              <div className="hd-acts">
                <TogglePill label={volumeStepSaid(e.name, "down")} disabled={e.volume != null && e.volume <= 0} onToggle={onVolumeDown!}>{VOLUME_STEP_WORDS.down}</TogglePill>
                <TogglePill label={volumeStepSaid(e.name, "up")} disabled={e.volume != null && e.volume >= 100} onToggle={onVolumeUp!}>{VOLUME_STEP_WORDS.up}</TogglePill>
              </div>
            </div>
          )}
          {can.mute && (
            <ChoiceChips id={`${uid}-m`} label="Mute" options={[...ON_OFF]} value={e.muted == null ? null : e.muted ? "on" : "off"} onChange={(v) => onMuteChange!(v === "on")} />
          )}
          {can.source && (
            <ChoiceChips id={`${uid}-s`} label="Source" options={e.sources!.map((s) => ({ value: s, label: s }))} value={e.source} onChange={onSourceChange!} />
          )}
          {can.off && <div className="hd-acts"><TogglePill label={`Turn ${e.name} off`} onToggle={onTurnOff!}>{pressWord("turnOff")}</TogglePill></div>}
          {/* Last, a raised pill that acts once: it leaves the skin's look for Home Assistant's own player. */}
          {can.more && <div className="hd-acts"><TogglePill label={openInHomeAssistantSaid(e.name)} onToggle={onOpenMore!}>{OPEN_IN_HOME_ASSISTANT}</TogglePill></div>}
        </SheetBlock>
      )}
      {sheet && history && <Today samples={history.samples} currentHour={history.currentHour} summary={todaySummary(MEDIA_PLAYER_TODAY, history.playingMinutes)} />}
    </CardFrame>
  );
}

export type MediaPlayerSheetProps = SheetProps<MediaPlayerCardProps>;

/** The media player's detail view in a modal sheet. */
export const MediaPlayerSheet = detailsSheet(MediaPlayerCard);

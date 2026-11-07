import type { MediaPlayerEntity, MediaPlayerHistory } from "@dashhaus/core/entities/mediaPlayer/types";
import { MEDIA_PLAYER_TODAY, MUTED, isOff, isPlaying, mediaAbilities, mediaArtist, mediaLine, mediaPlayerWord, mediaPress, mediaTitle, playingFrom, pressWord } from "@dashhaus/core/entities/mediaPlayer/words";
import type { MediaPress } from "@dashhaus/core/entities/mediaPlayer/words";
import { lastChangedFact, lastSeenFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { usePicture, usePlayhead } from "@dashhaus/core/hooks";
import { MediaPlayerIcon } from "./icons";
import { Progress } from "./parts";
import { CardFrame, ChoiceChips, LevelBar, Picture, SheetBlock, Today, TogglePill, detailsSheet, paint, useCard } from "../../shared/ui";
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
  /** Sheet: the mute chips, Off or On. */
  onMuteChange?: (muted: boolean) => void;
  /** Sheet: the source chips. */
  onSourceChange?: (source: string) => void;
}

const ON_OFF = [{ value: "off", label: "Off" }, { value: "on", label: "On" }] as const;

/**
 * A media player (one `media_player.*`): what is playing, and the one press that plays, pauses or turns it on, gated
 * on what it supports; the pill says which. Playing is the accent; it is a state, so it never glows. The status line
 * says what is playing, the title first. Featured, it shows the artwork, the title and artist, and how far in, a line
 * and a clock that run on by themselves with no re-render. The name, or a press and hold, opens the sheet: the same,
 * skip back and on, the volume groove the sound card has, mute, the source, turning it off, and
 * today's playing. Its artwork is data, never a signal: no glow, never in a row, never inside the orb.
 */
export function MediaPlayerCard({ entity: e, history, variant, footprint, showControl, onPlay, onPause, onPrevious, onNext, onTurnOn, onTurnOff, onVolumeChange, onMuteChange, onSourceChange, onOpenDetails, onClose }: MediaPlayerCardProps) {
  const card = useCard("mp", { variant, footprint, showControl, area: e.area });
  const { uid, sheet, featured, area } = card;
  const unav = e.state === "unavailable";
  const playing = isPlaying(e);
  // A state: playing is the accent, with no glow. A player is not light, heat or daylight (attention-budget skill).
  const colors = paint("state", 0);
  const word = mediaPlayerWord(e);

  // The one press, where the player supports it and the card was given its handler.
  const handlers: Record<MediaPress, (() => void) | undefined> = { play: onPlay, pause: onPause, turnOn: onTurnOn, turnOff: onTurnOff };
  const viewOnly = !onPlay && !onPause && !onTurnOn && !onTurnOff;
  const wanted = mediaPress(e);
  const press = wanted && handlers[wanted] ? wanted : null;
  const verb = press ? pressWord(press) : undefined;
  const run = () => { if (press) handlers[press]?.(); };

  const line = mediaLine(e);
  const muted = !unav && !isOff(e) && e.muted === true;
  // Featured and the sheet show what is playing under the head, so their status line says where it plays from.
  const roomy = featured || sheet;
  const from = playingFrom(e);
  const status = roomy
    ? [area, from].filter(Boolean).join(" · ") || (unav ? "Unavailable" : line ?? word)
    : <>{line ?? area ?? (unav ? "Unavailable" : word)}{muted && <span className="mp-muted"> · {MUTED}</span>}</>;

  const orbLabel = unav ? `${e.name}: Unavailable` : verb ? `${verb} ${e.name}` : `${e.name}: ${word}`;
  const slot = press
    ? <TogglePill label={`${e.name}: ${word} · ${verb}`} on={playing} onToggle={run} extra={verb}>{word}</TogglePill>
    : <p className="mp-st">{word}</p>;

  const head = usePlayhead(e);
  const art = usePicture(unav ? undefined : e.picture);
  const title = mediaTitle(e);
  const artist = mediaArtist(e);
  const loaded = !unav && !isOff(e);
  const nowPlaying = roomy && loaded && (title || artist || head || e.picture);

  const can = {
    previous: loaded && e.supportsPrevious && !!onPrevious,
    next: loaded && e.supportsNext && !!onNext,
    off: !unav && !isOff(e) && e.supportsTurnOff && !!onTurnOff && press !== "turnOff",
    volume: loaded && e.supportsVolume && e.volume != null && !!onVolumeChange,
    mute: loaded && e.supportsMute && !!onMuteChange,
    source: loaded && e.supportsSource && (e.sources?.length ?? 0) > 0 && !!onSourceChange,
  };

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, ...colors }}
      orb={viewOnly ? undefined : { label: orbLabel, pressed: playing, intensity: 0, onToggle: run, children: <MediaPlayerIcon /> }}
      glyph={viewOnly ? <MediaPlayerIcon /> : undefined}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails && (() => onOpenDetails())}
      status={status}
      statusTitle={typeof status === "string" ? status : line ?? area}
      value={word}
      // The large readout is the volume, which no card control prints, or Muted; without one it repeats the pill's word.
      readout={unav ? { value: null } : muted ? { value: MUTED, duplicate: true, className: "mp-word" } : loaded && e.volume != null ? { value: <>{e.volume}<span>%</span></> } : { value: word, duplicate: true, className: "mp-word" }}
      onClose={onClose}
      control={slot}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: unav ? "" : mediaAbilities(e) }}
    >
      {nowPlaying && (
        <div className="mp-now" data-art={e.picture ? "" : undefined}>
          {e.picture && (
            <Picture picture={art} label={title ? `Artwork for ${title}` : `${e.name} artwork`} ratio="1 / 1">
              <MediaPlayerIcon />
            </Picture>
          )}
          <div className="mp-meta">
            {title && <p className="mp-title" title={title}>{title}</p>}
            {artist && <p className="mp-artist" title={artist}>{artist}</p>}
            {sheet && e.album && <p className="mp-album" title={e.album}>{e.album}</p>}
            {head && <Progress head={head} />}
          </div>
        </div>
      )}
      {(can.previous || can.next || can.off || can.volume || can.mute || can.source) && (
        <SheetBlock>
          {(can.previous || can.next) && (
            <div className="mp-acts">
              {can.previous && <TogglePill label={`${e.name}: previous track`} onToggle={onPrevious!}>Previous</TogglePill>}
              {can.next && <TogglePill label={`${e.name}: next track`} onToggle={onNext!}>Next</TogglePill>}
            </div>
          )}
          {can.volume && (
            <LevelBar
              id={`${uid}-vol`}
              heading="Volume"
              value={e.volume!}
              min={0}
              max={100}
              on={!muted}
              text={(pct) => `${pct}%`}
              offText={(pct) => `${MUTED} · ${pct}%`}
              valueText={(v) => (muted ? `${v} percent, muted` : `${v} percent`)}
              onChange={onVolumeChange!}
            />
          )}
          {can.mute && (
            <ChoiceChips id={`${uid}-m`} label="Mute" options={[...ON_OFF]} value={e.muted == null ? null : e.muted ? "on" : "off"} onChange={(v) => onMuteChange!(v === "on")} />
          )}
          {can.source && (
            <ChoiceChips id={`${uid}-s`} label="Source" options={e.sources!.map((s) => ({ value: s, label: s }))} value={e.source} onChange={onSourceChange!} />
          )}
          {can.off && <div className="mp-acts"><TogglePill label={`Turn ${e.name} off`} onToggle={onTurnOff!}>Turn off</TogglePill></div>}
        </SheetBlock>
      )}
      {sheet && history && <Today samples={history.samples} currentHour={history.currentHour} summary={todaySummary(MEDIA_PLAYER_TODAY, history.playingMinutes)} />}
    </CardFrame>
  );
}

export type MediaPlayerSheetProps = SheetProps<MediaPlayerCardProps>;

/** The media player's detail view in a modal sheet. */
export const MediaPlayerSheet = detailsSheet(MediaPlayerCard);

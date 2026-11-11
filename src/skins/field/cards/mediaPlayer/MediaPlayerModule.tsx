import { useId } from "react";
import type { ReactNode } from "react";
import type { MediaPlayerEntity, MediaPlayerHistory } from "@dashhaus/core/entities/mediaPlayer/types";
import { MEDIA_PLAYER_TODAY, MUTED, POSITION, SKIP_WORDS, artworkLabel, isActive, isOff, mediaAbilities, mediaArtist, mediaPlayerWord, mediaPress, mediaTitle, openInHomeAssistantSaid, playingFrom, pressWord, skipSaid, volumeBySteps, volumeReason, volumeStepSaid, volumeStepValue } from "@dashhaus/core/entities/mediaPlayer/words";
import type { MediaPress } from "@dashhaus/core/entities/mediaPlayer/words";
import { fmtPlayTime } from "@dashhaus/core/entities/format";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { VOLUME, volumeSaid, volumeText } from "@dashhaus/core/entities/volume";
import { usePicture, usePlayhead, useSeek } from "@dashhaus/core/hooks";
import { Blank, choices, Fader, Key, KeyGroup, ModuleFrame, Picture, Pictogram, Steps, Today, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { EITHER_WAY, EITHER_WAY_LEGEND, eitherWay, eitherWayHint } from "@dashhaus/core/entities/assumed";
import { IconMediaPlayer, IconMute, IconNext, IconOpenOut, IconPower, IconPrevious, MEDIA_PLAYER_PICT } from "./icons";
import { ScreenClock, ScreenProgress } from "./parts";
import "./MediaPlayerModule.css";

export interface MediaPlayerModuleProps {
  entity: MediaPlayerEntity;
  footprint?: FieldFootprint;
  /** Today's playing, for the detail panel. Omit to leave its meter dark. */
  history?: MediaPlayerHistory;
  /** Play: the first key, while it is paused, idle or on. */
  onPlay?: () => void;
  /** Pause: the first key, while it plays. */
  onPause?: () => void;
  /** Stops it, what a press does while it plays for a player that stops but doesn't pause (`mediaPress`). */
  onStop?: () => void;
  /** Skip back: the panel's Previous key. */
  onPrevious?: () => void;
  /** Skip on: the Next key, in the row and the panel. */
  onNext?: () => void;
  /** Turn it on: the first key while it is off or asleep, and the panel's Power key. */
  onTurnOn?: () => void;
  /** Turn it off: the panel's Power key. */
  onTurnOff?: () => void;
  /** The panel's volume fader (`MEDIA_PLAYER_ACTIONS`: a level). */
  onVolumeChange?: (percent: number) => void;
  /**
   * The panel's position fader, in seconds (`MEDIA_PLAYER_ACTIONS`: a level that runs on by itself), sent once when
   * it is let go; `false` (refused) draws Home Assistant's position again.
   */
  onSeek?: (seconds: number) => void | Promise<boolean>;
  /** The panel's volume plus key, one step, for a player that steps its volume rather than sets it. */
  onVolumeUp?: () => void;
  /** The panel's volume minus key. */
  onVolumeDown?: () => void;
  /** The panel's Mute key (`MEDIA_PLAYER_ACTIONS`: a switch). */
  onMuteChange?: (muted: boolean) => void;
  /** The panel's source keys (`MEDIA_PLAYER_ACTIONS`: a choice). */
  onSourceChange?: (source: string) => void;
  /**
   * Nothing on it runs by itself (the dashboard's `quiet`): no progress rule and no running clock, since a held one
   * would lie and a running one changes on its own; the panel's screen says the state's figure instead.
   */
  quiet?: boolean;
  /**
   * Open Home Assistant's own player for it: inside Home Assistant, its more-info dialog (`useHaMoreInfo`), which
   * browses media, groups players and sets the sound mode. The panel carries an Open key to it under a Home Assistant
   * legend, last among its controls; without one (a story, a standalone app) there is none.
   */
  onOpenMore?: () => void;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/**
 * The screen's figure, four places like a segment display's; the meta line says the state in its core word where the
 * figure is a hand-picked one (`HOLD` for Paused). Buffering is on its way, and an integration's own state is its own
 * words: blank segments, the words on the meta line.
 */
const FIGURE: Partial<Record<MediaPlayerEntity["state"], string>> = { playing: "PLAY", paused: "HOLD", idle: "IDLE", on: "ON", standby: "STBY", off: "OFF" };

/**
 * A media player (one `media_player.*`) as a field module. The screen says PLAY, HOLD, IDLE, ON, STBY or OFF beside its
 * artwork, a window in the screen square at its height (the player's pictogram, lit while it plays, where it has none);
 * the meta lines say what is playing, the title then the artist, and a rule along the screen's foot lights as it
 * plays, running on by itself. Under it the first key prints what a press does, **Pause** while it plays, **Play**
 * while it doesn't, **Turn on** while it is off, its LED lit while it plays or is on; then **Next**. The name, or a press and
 * hold, opens the panel: the time played as a running segment clock, Previous, Play and Next, the position fader where
 * the player seeks, the volume fader the sound module has (or a minus and a plus key for a player that steps its
 * volume), Mute, the source, Power, inside Home Assistant a key to its own player (browsing media, grouping), and today's
 * playing.
 */
export function MediaPlayerModule({ entity: e, history, onPlay, onPause, onStop, onPrevious, onNext, onTurnOn, onTurnOff, onVolumeChange, onSeek, onVolumeUp, onVolumeDown, onMuteChange, onSourceChange, onOpenMore, footprint = "standard", quiet = false, defaultOpen = false }: MediaPlayerModuleProps) {
  const details = useDetails(defaultOpen);
  const uid = useId();
  const unav = e.state === "unavailable";
  // Playing, buffering between tracks, or on with nothing to play: the LED, a lit pictogram and a bright figure
  // (spec/cards.md → One active signal).
  const active = isActive(e);
  const loaded = !unav && !isOff(e);
  const word = mediaPlayerWord(e);
  const muted = loaded && e.muted === true;
  // Why the volume doesn't sound now (Muted, Paused, Idle), or nothing while it does.
  const quietVolume = volumeReason(e);

  const handlers: Record<MediaPress, (() => void) | undefined> = { play: onPlay, pause: onPause, stop: onStop, turnOn: onTurnOn, turnOff: onTurnOff };
  const wanted = mediaPress(e);
  const press = wanted && handlers[wanted] ? wanted : null;

  // The artwork in the pictogram's place, never in a row (spec/field.md → A picture is a window in the screen).
  const art = usePicture(loaded ? e.picture : undefined);
  const glyph = <Pictogram param="neutral" lit={active}>{MEDIA_PLAYER_PICT}</Pictogram>;
  const title = mediaTitle(e);
  const artist = mediaArtist(e);
  const artwork = loaded && e.picture ? (
    <span className="fd-mp-art">
      <Picture picture={art} label={artworkLabel(e)} ratio="1 / 1">
        <svg viewBox="0 0 20 26" aria-hidden="true">{MEDIA_PLAYER_PICT}</svg>
      </Picture>
    </span>
  ) : glyph;

  const playhead = usePlayhead(e);
  // The panel's position fader, where the player seeks and there is a line to seek along (not a stream, not quiet).
  // While held, the screen's clock and rule hold at the target with it; once let go, they run on from there.
  const seek = useSeek(loaded && e.supportsSeek && !quiet ? playhead : undefined, onSeek);
  const head = quiet ? undefined : seek?.head ?? playhead;
  const held = !!seek?.held;
  const figure = FIGURE[e.state];
  const read: ReactNode = unav ? <Blank places={4} label={word} />
    : figure ? <><span aria-hidden="true">{figure}</span><span className="fd-sr">{word}</span></>
    : <Blank places={4} label={word} />;
  const progress = head && <ScreenProgress head={head} held={held} />;

  // The title first, then the artist; the state's word where the figure doesn't say it in full (Paused, Buffering, an
  // integration's own), and Muted, beside the artist.
  const says = !figure || e.state === "paused";
  const second = [says && title ? word : undefined, muted ? MUTED : undefined, artist].filter(Boolean).join(" · ");
  // Unavailable says when it was last seen in core's words ("Last seen 08:20"), as every module does.
  const meta: [ReactNode, ReactNode?] = unav ? [word, e.lastSeen ? lastSeenFact(e.lastSeen) : undefined]
    : !loaded ? [word, sinceFact(e.lastChanged)]
    : title ? [title, second || undefined]
    : [word, [muted ? MUTED : undefined, artist ?? playingFrom(e) ?? sinceFact(e.lastChanged)].filter(Boolean).join(" · ") || undefined];

  const primary = (wide: boolean) => (
    <Key
      key="press"
      label={unav ? `${e.name}, unavailable` : press ? `${pressWord(press)} ${e.name}` : `${e.name}, ${word.toLowerCase()}`}
      led={active}
      unavailable={unav || !press}
      onPress={() => { if (press) handlers[press]?.(); }}
      onHold={details.openDetails}
      wide={wide}
      caption={wide && press && !unav ? pressWord(press) : undefined}
    >
      <IconMediaPlayer />
    </Key>
  );
  // Next lies flat, rather than going, where there is nothing loaded to skip, so the row never reflows.
  const canNext = !!e.supportsNext && !!onNext;
  const nextKey = (
    <Key key="next" label={skipSaid(e.name, "next")} unavailable={!loaded} onPress={() => { if (loaded) onNext?.(); }} onHold={details.openDetails} wide caption={unav ? undefined : SKIP_WORDS.next}>
      <IconNext />
    </Key>
  );
  const canPrevious = !!e.supportsPrevious && !!onPrevious;
  const previousKey = (
    <Key key="previous" label={skipSaid(e.name, "previous")} unavailable={!loaded} onPress={() => { if (loaded) onPrevious?.(); }} wide caption={unav ? undefined : SKIP_WORDS.previous}>
      <IconPrevious />
    </Key>
  );
  const rowKeys = [primary(true), canNext && nextKey].filter(Boolean);
  const panelKeys = [canPrevious && previousKey, primary(true), canNext && nextKey].filter(Boolean);

  const sources = e.supportsSource && onSourceChange ? e.sources ?? [] : [];
  const canVolume = !!e.supportsVolume && !!onVolumeChange && e.volume != null;
  // A player that steps its volume rather than sets it: the Steps part in the fader's place, a minus and a plus key.
  const canStep = volumeBySteps(e) && !!onVolumeUp && !!onVolumeDown;
  const canMute = !!e.supportsMute && !!onMuteChange;
  const power = (e.supportsTurnOn && onTurnOn) || (e.supportsTurnOff && onTurnOff);
  const on = !unav && !isOff(e);

  // The panel's screen: the artwork, the time played as a running clock where the track has a length, what is playing.
  const panelScreen = {
    pict: artwork,
    read: head ? <><ScreenClock head={head} held={held} /><small>{fmtPlayTime(head.duration)}</small>{progress}</> : <>{read}{progress}</>,
    meta: head && title ? [title, [word, muted ? MUTED : undefined, artist].filter(Boolean).join(" · ")] as [ReactNode, ReactNode?] : meta,
  };

  return (
    <ModuleFrame
      kind="fd-mp"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      // Resting figures are dim, as off is: HOLD, IDLE, STBY and an integration's own; a paused clock is held, so dim
      // too. PLAY and ON stay bright, and buffering's blank segments are on their way.
      rest={e.state === "paused" || e.state === "idle" || e.state === "standby" || e.state === "other"}
      details={details}
      pict={footprint === "compact" ? glyph : artwork}
      read={<>{read}{progress}</>}
      meta={meta}
      line={footprint === "compact" && loaded ? (title ?? undefined) : undefined}
      lead={primary(false)}
      row={<KeyGroup label={e.name} columns={rowKeys.length}>{rowKeys}</KeyGroup>}
      panelScreen={panelScreen}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: unav ? "" : mediaAbilities(e) }}
    >
      <KeyGroup legend="Player" columns={panelKeys.length}>{panelKeys}</KeyGroup>
      {seek && (
        <Fader
          id={`${uid}-pos`}
          label={`${e.name} ${POSITION.toLowerCase()}`}
          // At rest the running time is the screen's figure, so the legend names the fader alone; while held it says
          // where the track will play from.
          legend={seek.target != null ? `${POSITION} ${fmtPlayTime(seek.target)}` : POSITION}
          value={seek.slider.value}
          min={seek.slider.min}
          max={seek.slider.max}
          step={seek.slider.step}
          lit
          // The player's second parameter: the volume keeps its first.
          param="b"
          valueText={seek.slider.valueText(seek.slider.value)}
          runs={{ running: seek.head.running, key: seek.head.key }}
          held={seek.held}
          onChange={seek.slider.onChange}
          onCommit={seek.slider.onCommit}
          current={seek.slider.current}
        />
      )}
      {canVolume && (
        <Fader
          id={`${uid}-vol`}
          label={`${e.name} volume`}
          // A loudness lights only while it sounds, active and unmuted; unlit, its legend says why first
          // (spec/cards.md → What every card shows).
          legend={volumeText(e.volume!, quietVolume)}
          value={e.volume!}
          min={0}
          max={100}
          lit={!quietVolume}
          disabled={!loaded}
          valueText={volumeSaid(e.volume!, quietVolume?.toLowerCase())}
          onChange={(v) => onVolumeChange?.(v)}
        />
      )}
      {canStep && (
        // A step is a tap, never a fader that would claim a level: the level where one is reported, else Muted or
        // nothing; flat with nothing loaded, as Next is.
        <Steps
          group={`${e.name}, ${VOLUME.toLowerCase()}`}
          label={VOLUME}
          value={loaded ? volumeStepValue(e) : undefined}
          downLabel={volumeStepSaid(e.name, "down")}
          upLabel={volumeStepSaid(e.name, "up")}
          atMin={e.volume != null && e.volume <= 0}
          atMax={e.volume != null && e.volume >= 100}
          unavailable={!loaded}
          onDown={() => onVolumeDown?.()}
          onUp={() => onVolumeUp?.()}
        />
      )}
      {/* Mute and Power latch, as the fan's oscillation does: On or Off printed, the LED lit while on. */}
      {canMute && (
        <KeyGroup legend="Mute" columns={2}>
          <Key label="Mute" pressed={muted} unavailable={!loaded || e.muted == null} wide caption={!loaded || e.muted == null ? undefined : muted ? "On" : "Off"} onPress={() => { if (loaded) onMuteChange?.(!muted); }}>
            <IconMute />
          </Key>
        </KeyGroup>
      )}
      {/* While Home Assistant only assumes its state (an IR TV), on and off apart, whatever the screen shows. */}
      {power && eitherWay(e) && e.supportsTurnOn && e.supportsTurnOff && onTurnOn && onTurnOff ? (
        <div className="fd-block">
          <KeyGroup legend={EITHER_WAY_LEGEND} columns={2}>
            {EITHER_WAY.map((w) => <Key key={w.value} label={`${e.name}, turn ${w.label.toLowerCase()}`} wide caption={w.label} onPress={w.value === "on" ? onTurnOn : onTurnOff}>{null}</Key>)}
          </KeyGroup>
          <p className="fd-hint">{eitherWayHint(e)}</p>
        </div>
      ) : power && (
        <KeyGroup legend="Power" columns={2}>
          <Key label="Power" pressed={on} unavailable={unav || (on ? !(e.supportsTurnOff && onTurnOff) : !(e.supportsTurnOn && onTurnOn))} wide caption={unav ? undefined : on ? "On" : "Off"} onPress={() => (on ? onTurnOff?.() : onTurnOn?.())}>
            <IconPower />
          </Key>
        </KeyGroup>
      )}
      {sources.length > 0 && (
        <KeyGroup legend="Source" value={loaded ? e.source : undefined} columns={choices(sources.length)} narrow={2}>
          {sources.map((source) => (
            <Key key={source} label={`Source ${source}`} wide caption={source} chosen={loaded && source === e.source} disabled={!loaded} onPress={() => onSourceChange?.(source)}>{null}</Key>
          ))}
        </KeyGroup>
      )}
      {onOpenMore && !unav && (
        // Last, a wide key that acts once, with no LED: it leaves the skin's look for Home Assistant's own player. Its
        // legend says where it goes and its caption what it does, as the camera's Camera / Live; its label says it whole.
        <KeyGroup legend="Home Assistant" columns={1}>
          <Key label={openInHomeAssistantSaid(e.name)} wide caption="Open" onPress={onOpenMore}><IconOpenOut /></Key>
        </KeyGroup>
      )}
      <Today
        summary={history && (unav ? word : todaySummary(MEDIA_PLAYER_TODAY, history.playingMinutes))}
        label="Playing by hour today."
        tone="neutral"
        samples={history?.samples}
        currentHour={history?.currentHour}
      />
    </ModuleFrame>
  );
}

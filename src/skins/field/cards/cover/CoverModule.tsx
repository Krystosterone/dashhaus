import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { CoverAction, CoverAsk, CoverEntity, CoverHistory } from "@dashhaus/core/entities/cover/types";
import { CLASS_LABEL, QUICK_ENDS, QUICK_POSITIONS, coverAskOpens, coverAskPosition, coverAskSettled, coverAskTo, coverAsksFirst, hasPosition, isMoving, openness, slatsBy, snapEnds } from "@dashhaus/core/entities/cover/position";
import { COVER_ASKS_HINT, LEFT_OPEN_WORD, SLAT_ENDS, coverAskAction, coverAskWaiting, coverAskDetail, coverQuestion, coverWord, leftOpenText, positionText } from "@dashhaus/core/entities/cover/words";
import { ACTION_FAILED } from "@dashhaus/core/entities/guard";
import { coverSeverity } from "@dashhaus/core/entities/cover/severity";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { useGuardedAction } from "@dashhaus/core/primitives";
import { Blank, Confirm, Digits, Fader, Key, ModuleFrame, Pictogram, Today, Warn, WarnWords, useDetails, KeyGroup, ModuleRow, Channel } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { IconCover, IconDown, IconStop, IconUp, SLATS, WINDOW } from "./icons";
import "./CoverModule.css";

export interface CoverModuleProps {
  entity: CoverEntity;
  footprint?: FieldFootprint;
  /** Today, for the detail panel. Omit to leave the panel without it. */
  history?: CoverHistory;
  /** A press does it, except on a garage door, door or gate, which asks first in the panel. */
  onOpenCover: () => void;
  /** A press does it, except on a garage door, door or gate, which asks first in the panel. */
  onCloseCover: () => void;
  /** Always one press. */
  onStopCover: () => void;
  /**
   * Move it to a position, 0 closed to 100 open. Omit, or a cover without a position, and there is no fader. A garage
   * door, door or gate's fader asks first in the panel, once it is let go.
   */
  onSetPosition?: (position: number) => void;
  /** Tilt a blind's slats, 0 to 100. Omit, or a cover without tilt, and the panel has no slats fader. */
  onSetTilt?: (tilt: number) => void;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
  /** Open the detail panel on this action's question: a garage door, door or gate (stories). */
  defaultAction?: CoverAsk;
}

/** A pointer value onto whole percent, with magnetic ends: a tap near an end closes or opens it fully. */
const snap = (raw: number) => snapEnds(Math.round(raw));

/** A percentage in its three fixed places: the leading digits unlit, read as the bare number. */
const Percent = ({ value }: { value: number }) => <><Digits value={value} /><small>%</small></>;

/**
 * One cover (curtains, blinds, shades, a garage door) as a field module. Position follows Home Assistant: 0 closed,
 * 100 open. The key closes it while it's open and opens it while it's closed, and stops it on the way; its LED says
 * it's open. The screen leads with how open it is beside a window lit from the bottom, in the position's colour, the
 * fader thumb's; a cover with no position says OPEN or SHUT. A garage door, door or gate left open is a warning on
 * the screen. The name, or a press and hold on the key, opens the detail panel: quick positions, slats, today. A
 * garage door, door or gate never moves on one press (`coverAsksFirst`): a press on its key opens the panel on the
 * question, as a lock's Unlock does, and stopping it is one press; its fader asks once a press or a drag lets go
 * (`MOVE FRONT GATE TO 40%?`), and its quick positions are its ends alone, each asking.
 */
export function CoverModule({ entity: e, footprint = "standard", history, onOpenCover, onCloseCover, onStopCover, onSetPosition, onSetTilt, defaultOpen = false, defaultAction }: CoverModuleProps) {
  const uid = useId();
  const unav = e.state === "unavailable";
  const asks = coverAsksFirst(e) && !unav;
  const details = useDetails(defaultOpen || (asks && defaultAction != null));
  // Reachable, but where it is isn't known (an RF blind, a garage door with no sensor): its screen has no reading, the
  // key opens it as Home Assistant's own toggle does, and every transport key acts.
  const unknown = e.state === "unknown";
  // Where it is isn't known, or only assumed (an RF blind Home Assistant can't hear back from): every Move key acts.
  const either = unknown || !!e.assumedState;
  const moving = isMoving(e);
  const pos = Math.round(openness(e));
  const open = !unav && (pos > 0 || e.state === "open");
  const withPos = hasPosition(e);
  // A garage door, door or gate's fader asks first, once let go (below).
  const settable = withPos && onSetPosition != null && !unav;
  const stopping = moving && e.supportsStop;
  const word = coverWord(e);
  // A door left open (core ranks it advisory) is about what it reads, so it stays on the screen, `Open` behind the
  // marker over since when, as a garage door's binary sensor says it; a row has no meta lines, so it takes the area's.
  const warned = coverSeverity(e) != null;
  // Its word, then since when, which gives way first (spec/cards.md → A warning's words fit a row).
  const warning = warned ? <WarnWords word={LEFT_OPEN_WORD} detail={leftOpenText(e.lastChanged).slice(LEFT_OPEN_WORD.length) || undefined} /> : undefined;

  // The window lights with the daylight let in, from the bottom; a cover with no position sets nothing, so it is neutral.
  const pict = <Pictogram level={pos / 100} lit={open} param={withPos ? "a" : "neutral"}>{WINDOW}</Pictogram>;
  // On the way, a cover with no position is neither open nor shut: its figure is blank, and the meta line says where it's going.
  const read: ReactNode = unav ? <Blank label="Unavailable" />
    : unknown ? <Blank places={4} label="Unknown" />
    : withPos ? <Percent value={pos} />
    : moving ? <Blank places={4} label={word} />
    : open ? "OPEN" : "SHUT";
  const since = !moving && sinceFact(e.lastChanged);
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? lastSeenFact(e.lastSeen) : undefined]
    : warned ? [<Warn key="w">{LEFT_OPEN_WORD}</Warn>, sinceFact(e.lastChanged)]
    : [word, since];

  // A garage door, door or gate asks first, as a lock's Unlock does: a press on its key (the module's, the row's, the
  // panel's) or on the panel's Close or Open opens the panel on the question, and a press and hold opens it bare, as on
  // every module. Stopping is never asked. On its way where it can't be stopped, its key lies flat.
  const guard = useGuardedAction<CoverAsk>({
    run: (a) => (typeof a !== "string" ? onSetPosition?.(a.position) : a === "open" ? onOpenCover() : onCloseCover()),
    needsCode: () => false,
    settled: (a) => coverAskSettled(a, e),
    initial: defaultAction,
    disabled: !asks,
  });
  const pending = guard.pending;
  const ask = (a: CoverAsk) => { guard.ask(a); details.openDetails(); };
  // Its fader draws where it is slid, and asks once let go, a press at once; while the question stands it shows where it
  // would go and takes no press, so the second press of a double press can't ask again, and on Cancel it is back where
  // the cover is.
  const [draft, setDraft] = useState<number | null>(null);
  const askTo = (v: number) => { setDraft(null); if (v !== pos) ask(coverAskTo(v)); };
  const shown = draft ?? (pending != null ? coverAskPosition(pending) : pos);
  const openPanel = () => { guard.close(); details.openDetails(); };
  const adrift = asks && moving && !e.supportsStop;
  const toward: CoverAction = open ? "close" : "open";
  const press = stopping ? onStopCover : asks ? () => { if (!adrift) ask(toward); } : open ? onCloseCover : onOpenCover;
  // The key says what pressing it does; its LED says it's open, and the screen says where it is.
  const verb = stopping ? "Stop" : open ? "Close" : "Open";
  const key = (wide: boolean) => (
    <Key
      label={unav ? `${e.name}, unavailable` : adrift ? `${e.name}, ${word.toLowerCase()}` : `${verb} ${e.name}${asks && !stopping ? ": asks first" : ""}`}
      led={open}
      unavailable={unav || adrift}
      onPress={press}
      onHold={openPanel}
      wide={wide}
      caption={wide && !unav && !adrift ? verb : undefined}
    >
      {stopping ? <IconStop /> : <IconCover kind={e.deviceClass} open={open} />}
    </Key>
  );
  // The key and the position fader, the same in the module and the panel. Without a position to set, the key spans the row
  // with what it does.
  const controls = (where: "m" | "p") => (
    <ModuleRow className="fd-cv-row" solo={!settable}>
      {key(!settable)}
      {settable && (
        <Fader
          id={`${uid}-${where}`}
          label={`${e.name} position${asks ? ": asks first" : ""}`}
          legend={moving ? word : "Position"}
          value={asks ? shown : pos}
          min={0}
          max={100}
          lit={open}
          disabled={asks && (adrift || pending != null)}
          valueText={positionText(asks ? shown : pos)}
          snap={snap}
          onChange={asks ? setDraft : onSetPosition}
          onCommit={asks ? askTo : undefined}
        />
      )}
    </ModuleRow>
  );

  // The panel's content: the screen, with a blind's slats on its second channel; the controls; quick positions, or
  // close, stop and open for a cover with no position or a garage door, door or gate; the slats fader; today; and
  // facts. While a question stands, the question alone under the screen.
  const slats = unav ? undefined : slatsBy(e);
  const tilt = slats && e.tilt != null ? Math.round(e.tilt) : undefined;
  const today = history && (unav ? "Unavailable" : e.lastChanged ? `${moving ? (open ? "Open" : "Closed") : word} since ${e.lastChanged}` : undefined);

  const aside = tilt != null ? (
    <Channel pict={<Pictogram lit param="b">{SLATS}</Pictogram>} sub="Slats"><Percent value={tilt} /></Channel>
  ) : undefined;

  // The panel's own groups, under the key: quick positions, or close, stop and open for a cover with no position or
  // whose position isn't set here; the slats fader; today.
  const move = (
    <KeyGroup legend="Move">
      <Key label={`${e.name}, close${asks ? ": asks first" : ""}`} wide caption="Close" unavailable={adrift || (!open && !moving && !either)} onPress={asks ? () => ask("close") : onCloseCover}><IconDown /></Key>
      {e.supportsStop && <Key label={`${e.name}, stop`} wide caption="Stop" unavailable={!moving && !either} onPress={onStopCover}><IconStop /></Key>}
      <Key label={`${e.name}, open${asks ? ": asks first" : ""}`} wide caption="Open" unavailable={adrift || (open && !moving && !either)} onPress={asks ? () => ask("open") : onOpenCover}><IconUp /></Key>
    </KeyGroup>
  );
  const panel = (
    <>
      {settable && onSetPosition && !asks && (
        <KeyGroup legend="Quick positions" columns={4} narrow={2}>
          {QUICK_POSITIONS.map((q) => <Key key={q.value} label={positionText(q.value)} wide caption={q.label} chosen={!moving && q.value === pos} onPress={() => onSetPosition(q.value)}>{null}</Key>)}
        </KeyGroup>
      )}

      {/* A garage door, door or gate with a position: its ends alone, each asking first, under the line that says so. */}
      {settable && asks && (
        <div className="fd-block">
          <KeyGroup legend="Quick positions" columns={2}>
            {QUICK_ENDS.map((q) => <Key key={q.value} label={`${positionText(q.value)}: asks first`} wide caption={q.label} chosen={!moving && q.value === pos} unavailable={adrift} onPress={() => askTo(q.value)}>{null}</Key>)}
          </KeyGroup>
          <p className="fd-hint">{COVER_ASKS_HINT}</p>
        </div>
      )}

      {/* A cover with no position, or a garage door, door or gate whose position isn't set here: explicit transport, each
          key acting once (asking first, for those three); the one that can't act lies flat. Unknown, any of them can,
          since it could be anywhere and on its way. */}
      {!unav && asks && !settable && <div className="fd-block">{move}<p className="fd-hint">{COVER_ASKS_HINT}</p></div>}
      {!unav && !asks && !withPos && move}

      {/* Slats set to an angle on a fader, with no thumb while their tilt isn't known (unknown); slats that only open
          and close, a key for each, the one they're at chosen. */}
      {slats === "position" && onSetTilt && (
        <Fader
          id={`${uid}-t`}
          label={`${e.name} slats`}
          legend="Slats"
          value={tilt ?? 0}
          min={0}
          max={100}
          lit
          empty={tilt == null}
          param="b"
          valueText={tilt == null ? "Unknown" : `${tilt} percent open`}
          onChange={onSetTilt}
        />
      )}
      {slats === "ends" && onSetTilt && (
        <KeyGroup legend="Slats" columns={2}>
          {SLAT_ENDS.map((end) => <Key key={end.value} label={`${e.name} slats, ${end.label.toLowerCase()}`} wide caption={end.label} chosen={end.value === tilt} onPress={() => onSetTilt(end.value)}>{null}</Key>)}
        </KeyGroup>
      )}

      {history && <Today summary={today} label="Open by hour today." tone={withPos ? "a" : "neutral"} samples={history.samples} currentHour={history.currentHour} />}


      {/* Unavailable, what it can do isn't known, so only its kind is printed. */}
    </>
  );

  return (
    <ModuleFrame
      kind="fd-cv"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      // Closed is a reading, 0% open, so its figure keeps its places in the dim ink, as OFF does.
      rest={e.state === "closed"}
      warning={footprint === "compact" ? warning : undefined}
      // On its way with no position, a row's screen is blank, so its line says where it's going in the area's place,
      // as Orb's compact groove does: every row carries one state cue a sighted user can see.
      line={moving && !withPos ? word : undefined}
      details={{ ...details, openDetails: openPanel }}
      panelFocus={pending ? "content" : undefined}
      pict={pict}
      read={read}
      meta={meta}
      lead={key(false)}
      // While the question stands it is the panel's one control: the key, the fader and the facts make way for it.
      row={controls("m")}
      controls={pending ? undefined : controls}
      aside={aside}
      facts={pending ? undefined : { start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: unav ? CLASS_LABEL[e.deviceClass] : `${CLASS_LABEL[e.deviceClass]} · ${[withPos ? "position" : "open / close", slats ? "tilt" : null].filter(Boolean).join(", ")}` }}
    >
      {pending ? (
        <Confirm key={guard.pendingKey}
          question={coverQuestion(pending, e.name)} detail={coverAskDetail(pending, e)}
          action={coverAskAction(pending, e)} actionLabel={`${coverAskAction(pending, e)}, ${e.name}`}
          icon={coverAskOpens(pending, e) ? <IconUp /> : <IconDown />}
          busy={guard.busy} waiting={coverAskWaiting(e)} error={guard.failed ? ACTION_FAILED : null}
          onConfirm={() => void guard.confirm()} onCancel={guard.close} />
      ) : panel}
    </ModuleFrame>
  );
}

import { useRef, useState } from "react";
import type { CoverAction, CoverAsk, CoverEntity, CoverHistory } from "@dashhaus/core/entities/cover/types";
import { CLASS_LABEL, QUICK_ENDS, QUICK_POSITIONS, coverAskPosition, coverAskSettled, coverAskTo, coverAsksFirst, hasPosition, isAccess, isMoving, openness, slatsBy } from "@dashhaus/core/entities/cover/position";
import { COVER_ASKS_HINT, SLAT_ENDS, SLAT_POSITIONS, coverAskAction, coverAskWaiting, coverAskDetail, coverQuestion, coverWord, leftOpenText } from "@dashhaus/core/entities/cover/words";
import { ACTION_FAILED } from "@dashhaus/core/entities/guard";
import { coverSeverity } from "@dashhaus/core/entities/cover/severity";
import { lastChangedFact, lastSeenFact } from "@dashhaus/core/entities/facts";
import { useGuardedAction } from "@dashhaus/core/primitives";
import { CoverIcon } from "./icons";
import { PositionBar, OpenCloseControl } from "./parts";
import { AlertStatus, CardFrame, ChoiceChips, Confirm, SheetBlock, Today, detailsSheet, paint, useCard } from "../../shared/ui";
import type { ActionCardProps, SheetProps } from "../../shared/ui";
import "./CoverCard.css";

export type { CoverAction, CoverAsk };

export interface CoverCardProps extends ActionCardProps<CoverAsk> {
  entity: CoverEntity;
  /** Shown in the featured footprint and in the sheet. */
  history?: CoverHistory;
  /**
   * Compact only. false removes the inline control, shows the value in its place, and makes the row open
   * the detail sheet. The orb keeps its tap and hold actions. Default true.
   */
  showControl?: boolean;
  /** A tap does it, except on a garage door, door or gate, which asks first in the sheet. */
  onOpenCover: () => void;
  /** A tap does it, except on a garage door, door or gate, which asks first in the sheet. */
  onCloseCover: () => void;
  /** Always one tap. */
  onStopCover: () => void;
  /** A drag or a tap sets it, except on a garage door, door or gate, which asks first in the sheet once it is let go. */
  onSetPosition?: (position: number) => void;
  onSetTilt?: (tilt: number) => void;
}

/**
 * One cover: curtains, blinds, shades, garage doors. Position follows Home Assistant: 0 closed, 100 open.
 * It shares the modular footprint matrix with every dashboard card. A garage door, door or gate never moves on one
 * tap (`coverAsksFirst`): a tap on the orb or either end of its groove opens the sheet on the question, as a lock's
 * unlock does, and stopping it is one tap; its bar asks once a tap or a drag lets go (`Move Front gate to 40%?`).
 */
export function CoverCard({ entity: e, history, variant, footprint, showControl, onOpenCover, onCloseCover, onStopCover, onSetPosition, onSetTilt, onOpenDetails, onClose, action }: CoverCardProps) {
  const card = useCard("cv", { variant, footprint, showControl, area: e.area });
  const { uid, sheet, area } = card;
  const unav = e.state === "unavailable";
  // Reachable, but where it is isn't known (an RF blind, a garage door with no sensor): it is drawn as not open,
  // says Unknown, and both ends of its control act.
  const unknown = e.state === "unknown";
  // Where it is isn't known, or only assumed (an RF blind Home Assistant can't hear back from): both ends act.
  const either = unknown || !!e.assumedState;
  const moving = isMoving(e);
  const pos = Math.round(openness(e));
  const open = pos > 0 || e.state === "open";
  // A cover that lets a person in: open is a state (the accent orb, no glow), and reads as a warning.
  const access = isAccess(e.deviceClass);
  // Glow is energy flowing: daylight coming in through an open curtain. A garage door lets in no light worth showing.
  const colors = paint(access ? "state" : "energy", unav || access ? 0 : (0.6 * pos) / 100);

  const withPos = hasPosition(e);
  const slats = slatsBy(e);
  const word = coverWord(e);
  // The readout says how far open as a figure where it knows, and the state's word otherwise.
  const figure = !unknown && withPos && pos > 0;
  const text = moving ? `${word}${withPos ? ` · ${pos}%` : ""}`
    : unknown || !open || !withPos || pos === 100 ? word : `${word} · ${pos}%`;
  const stopping = moving && e.supportsStop;

  // A garage door, door or gate asks first: on the card a tap opens the sheet on the question, which the sheet holds.
  // Stopping is never asked. On its way where it can't be stopped, it lies flat and says so, as a lock does on its way.
  const asks = coverAsksFirst(e) && !unav;
  const guard = useGuardedAction<CoverAsk>({
    run: (a) => (typeof a !== "string" ? onSetPosition?.(a.position) : a === "open" ? onOpenCover() : onCloseCover()),
    needsCode: () => false,
    settled: (a) => coverAskSettled(a, e),
    initial: action,
    disabled: !asks,
    askElsewhere: sheet ? undefined : (a) => onOpenDetails?.(a),
  });
  const pending = guard.pending;
  const adrift = asks && moving && !e.supportsStop;
  const toward: CoverAction = open ? "close" : "open";
  const orbAction = stopping ? onStopCover : adrift ? () => {} : asks ? () => guard.ask(toward) : open ? onCloseCover : onOpenCover;
  const orbLabel = stopping ? `Stop ${e.name}` : adrift ? `${e.name}: ${word}` : asks ? `${toward === "open" ? "Open" : "Close"} ${e.name}…` : e.name;
  // Core ranks it (a garage door, door or gate left open is advisory); the card draws the level it is given.
  const level = coverSeverity(e);
  const warned = level != null;
  const identity = area ?? CLASS_LABEL[e.deviceClass];
  const warning = warned ? leftOpenText(e.lastChanged) : undefined;
  const alertLabel = warned ? `Warning: ${e.name}: ${warning}` : undefined;

  // A door left open leads the status line behind the warn marker in every footprint, in the words a garage door's
  // binary sensor says it in (spec/orb.md → the warn colour); otherwise the room, and in the sheet what it is.
  const areaText = sheet && area && !(access && open) ? `${area} · ${CLASS_LABEL[e.deviceClass]}` : identity;

  // Its position is set on the window's bar. A garage door, door or gate's bar draws where it is dragged and asks once
  // let go, a tap at once; while the question stands it shows where it would go and takes no press, so the second tap
  // of a double tap can't ask again, and on Cancel it is back where the cover is.
  const settable = withPos && onSetPosition != null;
  const [draft, setDraft] = useState<number | null>(null);
  // The position a released gesture asked for, held while Home Assistant catches up, so the bar never snaps back to
  // where the cover was. The next report (a new position) takes over.
  const [released, setReleased] = useState<{ at: number; from: number } | null>(null);
  // Whether this gesture picked a value at all: a tap where the bar already is reports nothing.
  const picked = useRef(false);
  const draftTo = (v: number) => { picked.current = true; setDraft(v); };
  const askTo = (v: number) => { picked.current = false; setDraft(null); if (v !== pos) guard.ask(coverAskTo(v)); };
  const setTo = (v: number) => {
    const changed = picked.current;
    picked.current = false;
    if (!changed) return;
    setDraft(null);
    if (v === pos) { setReleased(null); return; }
    setReleased({ at: v, from: pos });
    onSetPosition?.(v);
  };
  const held = released == null || released.from !== pos ? null : released.at;
  const shown = draft ?? (pending != null ? coverAskPosition(pending) : held ?? pos);
  const shownText = shown === pos ? text : shown === 0 ? "Closed" : shown === 100 ? "Open" : `Open · ${shown}%`;
  let slot;
  if (settable && asks) {
    slot = (
      <PositionBar id={`${uid}-p`} label={`${e.name} position…`} kind={e.deviceClass === "curtain" ? "curtain" : "shade"} position={shown} moving={moving && draft == null} text={shownText}
        disabled={adrift || pending != null} onChange={draftTo} onCommit={askTo} />
    );
  } else if (settable) {
    slot = <PositionBar id={`${uid}-p`} label={`${e.name} position`} kind={e.deviceClass === "curtain" ? "curtain" : "shade"} position={shown} moving={moving && draft == null && held == null} text={shownText} onChange={draftTo} onCommit={setTo} />;
  } else {
    slot = (
      <OpenCloseControl name={e.name} open={open} moving={moving} either={either} asks={asks} flat={adrift || pending != null} text={text} canStop={e.supportsStop}
        onOpen={asks ? () => guard.ask("open") : onOpenCover} onClose={asks ? () => guard.ask("close") : onCloseCover} onStop={onStopCover} />
    );
  }

  // The compact value appears under the name, or in place of a hidden control.
  const subText = unav ? "Unavailable" : warning ?? text;
  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, ...colors }}
      level={level}
      orb={{ label: orbLabel, pressed: open && !unav, intensity: pos / 100, onToggle: orbAction, children: <CoverIcon kind={e.deviceClass} open={open} stop={stopping} /> }}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails && (() => onOpenDetails())}
      status={alertLabel ? <AlertStatus label={alertLabel}>{warning}</AlertStatus> : areaText}
      value={subText}
      alert={alertLabel}
      readout={{ value: unav ? null : figure ? <>{pos}<span>%</span></> : word, duplicate: true, word: !figure }}
      onClose={onClose}
      closeLabel={`Close ${e.name} details`}
      closeFocus={!pending}
      control={slot}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: [CLASS_LABEL[e.deviceClass], withPos ? "position" : "open / close", slats ? "tilt" : null].filter(Boolean).join(", ") }}
    >
      {!unav && (
        <SheetBlock>
          {pending && (
            <Confirm key={guard.pendingKey} busy={guard.busy} waiting={coverAskWaiting(e)} error={guard.failed ? ACTION_FAILED : null}
              question={coverQuestion(pending, e.name)} detail={coverAskDetail(pending, e)} action={coverAskAction(pending, e)}
              onConfirm={() => void guard.confirm()} onCancel={guard.close} />
          )}
          {asks && !pending && <p className="hd-note">{COVER_ASKS_HINT}</p>}
          {settable && !asks && <ChoiceChips id={`${uid}-q`} label="Quick positions" options={QUICK_POSITIONS} value={moving ? null : pos} onChange={onSetPosition} />}
          {/* A garage door, door or gate's quick positions are its ends alone, each asking first. */}
          {settable && asks && !pending && !adrift && (
            <ChoiceChips id={`${uid}-q`} label="Quick positions" options={QUICK_ENDS.map((q) => ({ ...q, label: `${q.label}…` }))} value={moving ? null : pos} onChange={askTo} />
          )}
          {/* Slats set to an angle, or only opened and closed; none chosen while their tilt isn't known (unknown). */}
          {slats && onSetTilt && <ChoiceChips id={`${uid}-t`} label="Slats" options={slats === "ends" ? SLAT_ENDS : SLAT_POSITIONS} value={e.tilt ?? null} onChange={onSetTilt} />}
        </SheetBlock>
      )}
      {history && <Today samples={history.samples} currentHour={history.currentHour} summary={e.lastChanged ? `${moving ? (open ? "Open" : "Closed") : word} since ${e.lastChanged}` : ""} />}
    </CardFrame>
  );
}

export type CoverSheetProps = SheetProps<CoverCardProps>;

export const CoverSheet = detailsSheet(CoverCard);

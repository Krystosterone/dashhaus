import type { CoverEntity, CoverHistory } from "@dashhaus/core/entities/cover/types";
import { CLASS_LABEL, QUICK_POSITIONS, hasPosition, isAccess, isMoving, openness } from "@dashhaus/core/entities/cover/position";
import { SLAT_POSITIONS, coverWord, leftOpenSentence, leftOpenText } from "@dashhaus/core/entities/cover/words";
import { coverSeverity } from "@dashhaus/core/entities/cover/severity";
import { lastChangedFact, lastSeenFact } from "@dashhaus/core/entities/facts";
import { CoverIcon } from "./icons";
import { PositionBar, OpenCloseControl } from "./parts";
import { AlertStatus, CardFrame, ChoiceChips, SheetBlock, Today, detailsSheet, paint, useCard } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./CoverCard.css";

export interface CoverCardProps extends CardProps {
  entity: CoverEntity;
  /** Shown in the featured footprint and in the sheet. */
  history?: CoverHistory;
  /**
   * Compact only. false removes the inline control, shows the value in its place, and makes the row open
   * the detail sheet. The orb keeps its tap and hold actions. Default true.
   */
  showControl?: boolean;
  onOpenCover: () => void;
  onCloseCover: () => void;
  onStopCover: () => void;
  onSetPosition?: (position: number) => void;
  onSetTilt?: (tilt: number) => void;
  /** Card only: the name, and press and hold on the orb, open the details sheet. */
  onOpenDetails?: () => void;
  onClose?: () => void;
}

/**
 * One cover: curtains, blinds, shades, garage doors. Position follows Home Assistant: 0 closed, 100 open.
 * It shares the modular footprint matrix with every dashboard card.
 */
export function CoverCard({ entity: e, history, variant, footprint, showControl, onOpenCover, onCloseCover, onStopCover, onSetPosition, onSetTilt, onOpenDetails, onClose }: CoverCardProps) {
  const card = useCard("cv", { variant, footprint, showControl, area: e.area });
  const { uid, sheet, area } = card;
  const unav = e.state === "unavailable";
  // Reachable, but where it is isn't known (an RF blind, a garage door with no sensor): it is drawn as not open,
  // says Unknown, and both ends of its control act.
  const unknown = e.state === "unknown";
  const moving = isMoving(e);
  const pos = openness(e);
  const open = pos > 0 || e.state === "open";
  // A cover that lets a person in: open is a state (the accent orb, no glow), and reads as a warning.
  const access = isAccess(e.deviceClass);
  // Glow is energy flowing: daylight coming in through an open curtain. A garage door lets in no light worth showing.
  const colors = paint(access ? "state" : "energy", unav || access ? 0 : (0.6 * pos) / 100);

  const withPos = hasPosition(e);
  const word = coverWord(e);
  const text = moving ? `${word}${withPos ? ` · ${pos}%` : ""}`
    : unknown || !open || !withPos || pos === 100 ? word : `${word} · ${pos}%`;
  const stopping = moving && e.supportsStop;
  const orbAction = stopping ? onStopCover : open ? onCloseCover : onOpenCover;
  const orbLabel = stopping ? `Stop ${e.name}` : e.name;
  // Core ranks it (a garage door, door or gate left open is advisory); the card draws the level it is given.
  const warned = coverSeverity(e) != null;
  const identity = area ?? CLASS_LABEL[e.deviceClass];
  const warning = warned ? leftOpenText(e.lastChanged) : undefined;
  const alertLabel = warned ? `Warning: ${leftOpenSentence(e.name, e.lastChanged)}` : undefined;

  // A door left open leads the status line behind the warn marker in every footprint, in the words a garage door's
  // binary sensor says it in (spec/orb.md → the warn colour); otherwise the room, and in the sheet what it is.
  const areaText = sheet && area && !(access && open) ? `${area} · ${CLASS_LABEL[e.deviceClass]}` : identity;

  let slot;
  if (withPos && onSetPosition) {
    slot = <PositionBar id={`${uid}-p`} label={`${e.name} position`} kind={e.deviceClass === "curtain" ? "curtain" : "shade"} position={pos} moving={moving} text={text} onChange={onSetPosition} />;
  } else {
    slot = <OpenCloseControl name={e.name} open={open} moving={moving} either={unknown} text={text} canStop={e.supportsStop} onOpen={onOpenCover} onClose={onCloseCover} onStop={onStopCover} />;
  }

  // The compact value appears under the name, or in place of a hidden control.
  const subText = unav ? "Unavailable" : warning ?? text;
  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, "data-alert": warned ? "warn" : undefined, ...colors }}
      orb={{ label: orbLabel, pressed: open && !unav, intensity: pos / 100, onToggle: orbAction, children: <CoverIcon kind={e.deviceClass} open={open} stop={stopping} /> }}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={alertLabel ? <AlertStatus label={alertLabel}>{warning}</AlertStatus> : areaText}
      value={subText}
      alert={alertLabel}
      readout={{ value: unav ? null : !unknown && withPos && pos > 0 ? <>{pos}<span>%</span></> : word, duplicate: true }}
      onClose={onClose}
      closeLabel={`Close ${e.name} details`}
      control={slot}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: [CLASS_LABEL[e.deviceClass], withPos ? "position" : "open / close", e.supportsTilt ? "tilt" : null].filter(Boolean).join(", ") }}
    >
      {!unav && (
        <SheetBlock>
          {withPos && onSetPosition && <ChoiceChips id={`${uid}-q`} label="Quick positions" options={QUICK_POSITIONS} value={moving ? null : pos} onChange={onSetPosition} />}
          {e.supportsTilt && e.tilt != null && onSetTilt && <ChoiceChips id={`${uid}-t`} label="Slats" options={SLAT_POSITIONS} value={e.tilt} onChange={onSetTilt} />}
        </SheetBlock>
      )}
      {history && <Today samples={history.samples} currentHour={history.currentHour} summary={e.lastChanged ? `${moving ? (open ? "Open" : "Closed") : word} since ${e.lastChanged}` : ""} />}
    </CardFrame>
  );
}

export type CoverSheetProps = SheetProps<CoverCardProps>;

export const CoverSheet = detailsSheet(CoverCard);

import type { ToggleEntity, ToggleHistory, DurationOption } from "@dashhaus/core/entities/toggle/types";
import { DEFAULT_DURATIONS } from "@dashhaus/core/entities/toggle/durations";
import { toggleKind, toggleWord } from "@dashhaus/core/entities/toggle/words";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { ToggleIconSvg } from "./icons";
import { CardFrame, ChoiceChips, SheetBlock, Today, TogglePill, detailsSheet, paint, useCard } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./ToggleCard.css";

export interface ToggleCardProps extends CardProps {
  entity: ToggleEntity;
  /** Shown in the featured footprint and in the sheet. */
  history?: ToggleHistory;
  /**
   * Compact only. false removes the inline control, shows the value in its place, and makes the row open
   * the detail sheet. The orb keeps its tap and hold actions. Default true.
   */
  showControl?: boolean;
  /** Sheet: ways to turn it on. Omit `onTurnOnFor` to hide them. */
  durations?: DurationOption[];
  onToggle: () => void;
  /** Sheet: turn on (or keep on) with one of `durations`. */
  onTurnOnFor?: (value: string) => void;
  /** Card only: the name, and press and hold on the orb, open the details sheet. */
  onOpenDetails?: () => void;
  onClose?: () => void;
}

/**
 * A mode you switch on and off: Do Not Disturb, Quiet, Guest. One input_boolean or switch.
 * It uses the same card anatomy and footprint matrix as every other card.
 */
export function ToggleCard({ entity: e, history, variant, footprint, showControl, durations = DEFAULT_DURATIONS, onToggle, onTurnOnFor, onOpenDetails, onClose }: ToggleCardProps) {
  const card = useCard("tw", { variant, footprint, showControl, area: e.area });
  const { uid, sheet, area } = card;
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // A mode is a state, not energy: on is the accent, with no bloom and no glow.
  const colors = paint("state", 0);

  const ends = on ? (e.until ? `Until ${e.until}` : sinceFact(e.lastChanged) ?? "On") : null;
  // Where it applies; when it ends takes its place in compact cards, where the pill has no room to say so.
  // On and Off are the control's words: the status line never repeats them.
  const status = on && e.until && !unav
    ? <><span className="tw-st-u">{ends}</span><span className="tw-st-a">{area}</span></>
    // With no room to name (a titled bundle's lid names it), since when it has been as it is (last seen, unavailable).
    : area ?? (!sheet && (unav ? e.lastSeen : e.lastChanged) ? sinceFact(unav ? e.lastSeen : e.lastChanged) : null);
  const word = toggleWord(e);
  const valueText = on && e.until ? `${word} until ${e.until}` : word;

  // The compact value appears under the name, or in place of a hidden control.
  const subText = valueText;
  // The status line already says until when: the replacement value can stay short.
  const valText = word;
  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, ...colors }}
      orb={{ label: e.name, pressed: on, intensity: 0.7, onToggle, children: <ToggleIconSvg icon={e.icon} /> }}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={sheet && area ? `${area}${on && e.until ? ` · Until ${e.until}` : ""}` : status}
      value={subText}
      bareValue={valText}
      readout={{ value: unav ? null : word, duplicate: true, word: true }}
      onClose={onClose}
      control={<TogglePill label={`${e.name}: ${word} · ${on ? ends : "Turn on"}`} on={on} onToggle={onToggle} extra={on ? ends : "Turn on"}>{word}</TogglePill>}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: toggleKind(e) }}
    >
      {!unav && (
        <SheetBlock>
          {e.description && <p className="hd-note">{e.description}</p>}
          {onTurnOnFor && durations.length > 0 && (
            <ChoiceChips id={`${uid}-d`} label={on ? "Keep on" : "Turn on for"} options={durations} value={on ? e.duration ?? null : null} onChange={onTurnOnFor} />
          )}
        </SheetBlock>
      )}
      {history && <Today samples={history.samples} currentHour={history.currentHour} summary={todaySummary("on", history.onMinutes)} />}
    </CardFrame>
  );
}

export type ToggleSheetProps = SheetProps<ToggleCardProps>;

export const ToggleSheet = detailsSheet(ToggleCard);

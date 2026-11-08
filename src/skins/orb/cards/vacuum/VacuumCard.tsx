import type { VacuumEntity, VacuumHistory } from "@dashhaus/core/entities/vacuum/types";
import { FAN_SPEED, LOCATE_WORD, RETURN_WORDS, VACUUM_TODAY, batteryFact, fanSpeedLabel, isActive, locateSaid, pressSaid, pressWord, returnSaid, statusDetail, vacuumPress, vacuumWarning, vacuumWarningSaid, vacuumWarningText, vacuumWord } from "@dashhaus/core/entities/vacuum/words";
import { vacuumSeverity } from "@dashhaus/core/entities/vacuum/severity";
import type { VacuumPress } from "@dashhaus/core/entities/vacuum/words";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { VacuumIcon } from "./icons";
import { AlertStatus, CardFrame, ChoiceChips, Said, SheetBlock, Today, TogglePill, detailsSheet, paint, timed, useCard } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./VacuumCard.css";

export interface VacuumCardProps extends CardProps {
  entity: VacuumEntity;
  /** Today's cleaning: shown in the featured footprint and in the sheet. */
  history?: VacuumHistory;
  /** Start cleaning, or resume after a pause: the orb and the pill, while it stands. */
  onStart?: () => void;
  /** Pause where it is: the orb and the pill, while it moves. */
  onPause?: () => void;
  /** Send it to its dock: the sheet, or the orb and the pill of a vacuum that can't pause. */
  onReturnToBase?: () => void;
  /** Play its sound, to be found: the sheet. */
  onLocate?: () => void;
  /** Sheet: the fan speed chips. */
  onFanSpeedChange?: (speed: string) => void;
}

/**
 * A robot vacuum (one `vacuum.*`, its battery its own). One press does what it can now, gated on what it supports: it
 * pauses a vacuum that is moving and starts (or resumes) one that stands, and the pill says which. Its active set,
 * cleaning or on its way home (`isActive`), is the accent; it is a state, so it never glows. An error leads the status
 * line behind the warn marker with what went wrong, and a low battery away from the dock does too, as advisory
 * (`vacuumSeverity`); never more brightness. The name, or a press and hold, opens the sheet: the dock and locate, its
 * fan speeds, today's cleaning and its battery.
 */
export function VacuumCard({ entity: e, history, variant, footprint, showControl, onStart, onPause, onReturnToBase, onLocate, onFanSpeedChange, onOpenDetails, onClose }: VacuumCardProps) {
  const card = useCard("vc", { variant, footprint, showControl, area: e.area });
  const { uid, compact, area } = card;
  const unav = e.state === "unavailable";
  // Its active set, the one every skin's signal follows: cleaning, or on its way home between a clean and the dock.
  const active = isActive(e);
  // A state: active is the accent, with no glow. A vacuum is not light, heat or daylight (attention-budget skill).
  const colors = paint("state", 0);
  const word = vacuumWord(e);

  // The one press, where the vacuum supports it and the card was given its handler.
  const handlers: Record<VacuumPress, (() => void) | undefined> = { start: onStart, pause: onPause, return: onReturnToBase };
  const viewOnly = !onStart && !onPause && !onReturnToBase;
  const wanted = vacuumPress(e);
  const press = wanted && handlers[wanted] ? wanted : null;
  const verb = press ? pressWord(press, e) : undefined;
  const run = () => { if (press) handlers[press]?.(); };

  // Core ranks it: an error is urgent, a low battery away from the dock advisory; either leads the status line.
  const level = vacuumSeverity(e);
  const warning = level ? vacuumWarning(e) : undefined;
  const alertLabel = warning ? `Warning: ${e.name}: ${vacuumWarningSaid(e)}` : null;
  const detail = statusDetail(e);
  // The warning first, the short word on a row and what went wrong where there is room; else the room and what the
  // integration adds ("Charging"); with no room to name, its own detail.
  // Under 260 px the pill says only what a press does, so the line says the state it dropped: first, or after a warning.
  const acts = press && e.state !== "error";
  const plain = area ? <>{area}{detail && <span className="vc-detail"> · {detail}</span>}</> : unav ? "Unavailable" : timed(detail ?? sinceFact(e.lastChanged));
  const status = alertLabel
    ? <><AlertStatus label={alertLabel}>{compact ? warning : vacuumWarningText(e)}</AlertStatus>{acts && <Said word={word} behind />}</>
    : <>{acts && <Said word={word} rest={!!plain} />}{plain}</>;

  const orbLabel = unav ? `${e.name}: Unavailable` : press ? pressSaid(press, e) : `${e.name}: ${word}`;
  // After an error the pill says what a press does, as a jammed lock's says Lock again; the status line says Error.
  const slot = press
    ? (
      <TogglePill label={`${e.name}: ${word} · ${verb}`} on={active} onToggle={run} action={acts ? verb : undefined}>
        {e.state === "error" ? verb : word}
      </TogglePill>
    )
    : <p className="hd-st vc-st">{word}</p>;

  const canReturn = !unav && e.supportsReturn && !!onReturnToBase && press !== "return" && e.state !== "docked" && e.state !== "returning";
  const canLocate = !unav && e.supportsLocate && !!onLocate;
  const speeds = !unav && e.supportsFanSpeed && e.fanSpeeds && onFanSpeedChange ? e.fanSpeeds : null;
  const battery = batteryFact(e);

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, "data-alert": alertLabel ? "warn" : undefined, ...colors }}
      orb={viewOnly ? undefined : { label: orbLabel, pressed: active, intensity: 0, onToggle: run, children: <VacuumIcon /> }}
      glyph={viewOnly ? <VacuumIcon /> : undefined}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails && (() => onOpenDetails())}
      status={status}
      value={warning ?? word}
      alert={alertLabel}
      bareValue={word}
      readout={{ value: unav ? null : word, duplicate: true, word: true, className: "hd-num--long" }}
      onClose={onClose}
      control={slot}
      facts={{
        start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged),
        end: battery && level === "advisory" ? <span className="hd-warn">{battery}</span> : battery,
      }}
    >
      {(canReturn || canLocate || speeds) && (
        <SheetBlock>
          {(canReturn || canLocate) && (
            <div className="hd-acts">
              {canReturn && <TogglePill label={returnSaid(e.name)} onToggle={onReturnToBase!}>{RETURN_WORDS.long}</TogglePill>}
              {canLocate && <TogglePill label={locateSaid(e.name)} onToggle={onLocate!}>{LOCATE_WORD}</TogglePill>}
            </div>
          )}
          {speeds && (
            <ChoiceChips id={`${uid}-f`} label={FAN_SPEED} options={speeds.map((s) => ({ value: s, label: fanSpeedLabel(s) }))} value={e.fanSpeed} onChange={onFanSpeedChange!} />
          )}
        </SheetBlock>
      )}
      {history && <Today samples={history.samples} currentHour={history.currentHour} summary={todaySummary(VACUUM_TODAY, history.cleaningMinutes)} />}
    </CardFrame>
  );
}

export type VacuumSheetProps = SheetProps<VacuumCardProps>;

/** The vacuum's detail view in a modal sheet. */
export const VacuumSheet = detailsSheet(VacuumCard);

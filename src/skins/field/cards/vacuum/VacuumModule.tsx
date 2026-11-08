import type { ReactNode } from "react";
import type { VacuumEntity, VacuumHistory } from "@dashhaus/core/entities/vacuum/types";
import { vacuumSeverity } from "@dashhaus/core/entities/vacuum/severity";
import { FAN_SPEED, LOCATE_WORD, RETURN_WORDS, TO_THE_DOCK, VACUUM_TODAY, VACUUM_TODAY_SAID, batteryFact, fanSpeedLabel, fanSpeedSaid, isActive, locateSaid, lowBattery, pressHint, pressKeyWord, pressSaid, returnSaid, statusDetail, vacuumPress, vacuumWarning, vacuumWord } from "@dashhaus/core/entities/vacuum/words";
import type { VacuumPress } from "@dashhaus/core/entities/vacuum/words";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { Blank, choices, Key, KeyGroup, ModuleFrame, Pictogram, Today, Warn, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { IconDock, IconLocate, IconVacuum, VACUUM_PICT } from "./icons";
import "./VacuumModule.css";

export interface VacuumModuleProps {
  entity: VacuumEntity;
  footprint?: FieldFootprint;
  /** Today's cleaning, for the detail panel. Omit to leave its meter dark. */
  history?: VacuumHistory;
  /** Start cleaning, or resume after a pause: the first key, while it stands. */
  onStart?: () => void;
  /** Pause where it is: the first key, while it moves. */
  onPause?: () => void;
  /** Send it to its dock: the Return key, or the first key of a vacuum that can't pause. */
  onReturnToBase?: () => void;
  /** Play its sound, to be found: the panel's Locate key. */
  onLocate?: () => void;
  /** The panel's fan speed keys (`VACUUM_ACTIONS`: a choice). */
  onFanSpeedChange?: (speed: string) => void;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/**
 * The screen's figure, four places like a segment display's; the meta line says the state in its core word. Returning
 * is on its way, and an integration's own state is its own words: blank segments, the words on the meta line.
 */
const FIGURE: Partial<Record<VacuumEntity["state"], string>> = { cleaning: "RUN", docked: "DOCK", paused: "HOLD", idle: "IDLE", error: "ERR" };

/**
 * A robot vacuum (one `vacuum.*`, its battery its own) as a field module. The screen says RUN, DOCK, HOLD, IDLE or ERR
 * beside the vacuum, lit while it moves (`isActive`: cleaning, or on its way home); DOCK, IDLE and HOLD rest in the dim
 * ink (the module's `rest`). The meta lines say the state in words and since when (or what the integration adds:
 * Charging). Under it two keys print what pressing does: the first **Pause** while it moves, **Start** or **Resume**
 * while it stands, its LED the active signal; then **Return**, which sends it to the dock. An error is
 * urgent: an inverted block on the screen with what went wrong, and on a row's line. A low battery away from the dock
 * is advisory, on the plate in place of the area. The name, or a press and hold, opens the panel: the keys again with
 * Locate, the fan speeds, today's cleaning.
 */
export function VacuumModule({ entity: e, history, onStart, onPause, onReturnToBase, onLocate, onFanSpeedChange, footprint = "standard", defaultOpen = false }: VacuumModuleProps) {
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  // Its active set, the one every skin's signal follows: cleaning, or on its way home between a clean and the dock.
  const active = isActive(e);
  const level = vacuumSeverity(e);
  const urgent = level === "urgent";
  const word = vacuumWord(e);

  const handlers: Record<VacuumPress, (() => void) | undefined> = { start: onStart, pause: onPause, return: onReturnToBase };
  const wanted = vacuumPress(e);
  const press = wanted && handlers[wanted] ? wanted : null;

  const pict = <Pictogram param="neutral" lit={active}>{VACUUM_PICT}</Pictogram>;
  const figure = FIGURE[e.state];
  const read: ReactNode = unav ? <Blank places={4} label="Unavailable" />
    : figure ? <><span aria-hidden="true">{figure}</span><span className="fd-sr">{word}</span></>
    : <Blank places={4} label={word} />;
  const second = statusDetail(e) ?? sinceFact(e.lastChanged);
  // Standing still in a state it names (docked, idle, paused) rests: its figure in the dim ink, never blank segments.
  const rest = figure != null && !active && !urgent;
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? lastSeenFact(e.lastSeen) : undefined]
    : urgent ? [<Warn key="w" block>{vacuumWarning(e)}</Warn>, e.error ?? second]
    : e.state === "returning" ? [word, TO_THE_DOCK]
    : [word, second];
  // The plate shows one warning, the error outranking the battery; the panel still says a low battery (spec/field.md).
  const battery = level === "advisory" ? vacuumWarning(e) : undefined;
  const warning = level ? vacuumWarning(e) : undefined;

  const primary = (wide: boolean) => (
    <Key
      key="press"
      label={unav ? `${e.name}, unavailable` : !press ? `${e.name}, ${word.toLowerCase()}` : pressSaid(press, e)}
      led={active}
      unavailable={unav || !press}
      onPress={() => { if (press) handlers[press]?.(); }}
      onHold={details.openDetails}
      wide={wide}
      caption={wide && press && !unav ? pressKeyWord(press, e) : undefined}
    >
      <IconVacuum />
    </Key>
  );
  // Return sends it home; it lies flat where it is home already, or on its way, or the first key already does it.
  const canReturn = !!e.supportsReturn && !!onReturnToBase && press !== "return";
  const homeward = e.state === "docked" || e.state === "returning";
  const returnKey = (
    <Key key="return" label={returnSaid(e.name)} unavailable={unav || homeward} onPress={() => { if (!homeward) onReturnToBase?.(); }} onHold={details.openDetails} wide caption={unav ? undefined : RETURN_WORDS.short}>
      <IconDock />
    </Key>
  );
  const canLocate = !!e.supportsLocate && !!onLocate;
  const locateKey = (
    <Key key="locate" label={locateSaid(e.name)} unavailable={unav} onPress={() => onLocate?.()} wide caption={unav ? undefined : LOCATE_WORD}>
      <IconLocate />
    </Key>
  );
  const keys = (panel: boolean) => [primary(true), canReturn && returnKey, panel && canLocate && locateKey].filter(Boolean);

  const speeds = e.supportsFanSpeed && onFanSpeedChange ? e.fanSpeeds ?? [] : [];
  const batteryLine = batteryFact(e);

  return (
    <ModuleFrame
      kind="fd-vc"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      warning={footprint === "compact" ? warning : battery}
      alert={urgent ? { level, what: vacuumWarning(e)!, startedAt: undefined } : undefined}
      rest={rest}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={primary(false)}
      row={<KeyGroup label={e.name} columns={keys(false).length}>{keys(false)}</KeyGroup>}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: batteryLine }}
    >
      <div className="fd-block">
        <KeyGroup legend="Vacuum" columns={keys(true).length}>{keys(true)}</KeyGroup>
        {!unav && <p className="fd-hint">{pressHint(e)}</p>}
      </div>
      {speeds.length > 0 && (
        <KeyGroup legend={FAN_SPEED} value={e.fanSpeed ? fanSpeedLabel(e.fanSpeed) : undefined} columns={choices(speeds.length)} narrow={2}>
          {speeds.map((speed) => (
            <Key key={speed} label={fanSpeedSaid(speed)} wide caption={fanSpeedLabel(speed)} chosen={speed === e.fanSpeed} disabled={unav} onPress={() => onFanSpeedChange?.(speed)}>{null}</Key>
          ))}
        </KeyGroup>
      )}
      {!unav && lowBattery(e) && <p className="fd-hint"><Warn>{batteryLine}.</Warn></p>}
      <Today
        summary={history && (unav ? "Unavailable" : todaySummary(VACUUM_TODAY, history.cleaningMinutes))}
        label={VACUUM_TODAY_SAID}
        tone="neutral"
        samples={history?.samples}
        currentHour={history?.currentHour}
      />
    </ModuleFrame>
  );
}

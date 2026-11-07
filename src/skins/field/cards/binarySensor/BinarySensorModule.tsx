import type { ReactNode } from "react";
import type { BinarySensorEntity, BinarySensorHistory } from "@dashhaus/core/entities/binarySensor/types";
import { alertWord, pictureOf, stateWord, wordsOf } from "@dashhaus/core/entities/binarySensor/words";
import { stateSeverity } from "@dashhaus/core/entities/binarySensor/severity";
import { isLowBattery } from "@dashhaus/core/entities/battery";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { Blank, Glyph, ModuleFrame, ModuleRow, Pictogram, Today, Warn, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { BINARY_SENSOR_PICT, IconBinarySensor } from "./icons";
import "./BinarySensorModule.css";

export interface BinarySensorModuleProps {
  entity: BinarySensorEntity;
  footprint?: FieldFootprint;
  /** Today's hours on (open, wet, detecting), on the module's meter and in the panel. Omit and its hours stay dark. */
  history?: BinarySensorHistory;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/** The longest word the screen's figure holds, like a segment display's places; a longer one is said on the meta line. */
const PLACES = 5;
/** Shorter words for the figure where the class's own is too long to fit and a short one says the same. */
const SHORT: Record<string, string> = { Closed: "SHUT" };

/** The screen's figure: the state's word where it fits ("OPEN", "WET", "SMOKE"), else ON or OFF beside the full word. */
function figureOf(word: string, on: boolean): string {
  const short = SHORT[word] ?? word;
  return short.length <= PLACES ? short.toUpperCase() : on ? "ON" : "OFF";
}

/**
 * One binary sensor (a door, a window, a leak, smoke), with its device's battery, as a field module: a reading, so
 * nothing on it is pressed but its name. Where a control has its key and fader, it has its glyph, the picture its
 * device class names, on a flat plate, and today's meter of the hours it was on. The screen says the state in its
 * class's words (OPEN, SHUT, WET, SMOKE) beside its picture, lit while on; the meta lines the full word and since
 * when. Its warnings take their severity (`binarySensorSeverity`, the state's first): smoke, gas and carbon monoxide are an alarm, the
 * whole screen inverted and on the alert line; a leak is urgent, an inverted block on the screen and the alert line;
 * a low battery is advisory, the device's, on the plate in place of the area. An open door is a state, not a warning.
 */
export function BinarySensorModule({ entity: e, history, footprint = "standard", defaultOpen = false }: BinarySensorModuleProps) {
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const word = stateWord(e);
  const words = wordsOf(e.deviceClass);
  const picture = pictureOf(e.deviceClass);
  const since = sinceFact(e.lastChanged);

  // The state's own warning is about the reading: it stays on the screen. A low battery is the device's: the plate.
  const stateLevel = stateSeverity(e);
  const said = stateLevel ? alertWord(e) : undefined;
  const lowBattery = !unav && isLowBattery(e.battery) ? `Battery ${e.battery}%` : undefined;
  const battery = !stateLevel ? lowBattery : undefined;

  const pict = <Pictogram param="neutral" lit={on}>{BINARY_SENSOR_PICT[picture]}</Pictogram>;
  const figure = figureOf(word, on);
  const read: ReactNode = unav ? <Blank places={4} label="Unavailable" />
    : <><span className="fd-bs-fig" data-places={figure.length} aria-hidden="true">{figure}</span><span className="fd-sr">{word}</span></>;
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? `Seen ${e.lastSeen}` : undefined]
    // The figure is the alarm (SMOKE, GAS, CO): its first line says it was detected, as the alarm's names its cause.
    : stateLevel === "alarm" ? [`${words.today.charAt(0).toUpperCase()}${words.today.slice(1)}`, since]
    : stateLevel === "urgent" ? [<Warn key="w" block>{said}</Warn>, since]
    : stateLevel ? [<Warn key="w">{said}</Warn>, since]
    : [word, since];
  // An alarm and an urgent warning are pressing: the alert line names them, the module's name opening its details.
  const pressing = stateLevel === "alarm" || stateLevel === "urgent" ? stateLevel : undefined;
  const alert = pressing && said
    ? { level: pressing, what: said, startedAt: pressing === "alarm" ? e.changedAt : undefined, ...(pressing === "alarm" && { say: `Alarm: ${e.name}, ${said.toLowerCase()}.` }) }
    : undefined;
  // A row has no meta lines: a pressing warning takes the area's line, in its block.
  const warning = footprint === "compact" && pressing ? said : battery;

  const glyph = <Glyph unavailable={unav}><IconBinarySensor picture={picture} /></Glyph>;
  const summary = history && (unav ? "Unavailable" : todaySummary(words.today, history.onMinutes));
  const label = `${words.on} by hour today.`;

  return (
    <ModuleFrame
      kind="fd-bs"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      warning={warning}
      alert={alert}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={glyph}
      row={(
        <ModuleRow className="fd-bs-row">
          {glyph}
          <Today summary={summary} label={label} tone="neutral" samples={history?.samples} currentHour={history?.currentHour} />
        </ModuleRow>
      )}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: e.battery != null && !unav ? `Battery ${e.battery}%` : "" }}
    >
      {history && <Today summary={summary} label={label} tone="neutral" samples={history.samples} currentHour={history.currentHour} />}
      {lowBattery && <p className="fd-hint"><Warn>{lowBattery}. Replace it soon.</Warn></p>}
    </ModuleFrame>
  );
}

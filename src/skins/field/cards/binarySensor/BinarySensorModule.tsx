import type { ReactNode } from "react";
import type { BinarySensorEntity, BinarySensorHistory } from "@dashhaus/core/entities/binarySensor/types";
import type { BinarySensorClass } from "@dashhaus/core/entities/binarySensor/types";
import { ALERT_SPOKEN, alertText, alertWord, pictureOf, stateWord, wordsOf } from "@dashhaus/core/entities/binarySensor/words";
import { stateSeverity } from "@dashhaus/core/entities/binarySensor/severity";
import { batteryAdvice, batteryText, isLowBattery } from "@dashhaus/core/entities/battery";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { fmtAgo } from "@dashhaus/core/entities/format";
import { useNow } from "@dashhaus/core/hooks";
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

/**
 * The screen's figure, by class and state, at four places or fewer like a segment display's, the same in every
 * footprint: a door OPEN or SHUT, a leak sensor WET or DRY, a detector's alarm GAS or CO. A detector that is clear,
 * and a sensor that reads normal, say OK in the dim ink, never OFF, so a clear smoke detector never reads as switched
 * off. A standard module's smoke alarm may take a fifth place (SMOKE), as the alarm's ALARM does; in a row an alarm
 * says how long ago instead. Anything else is ON or OFF, the whole word on the meta line.
 */
const OPEN_SHUT = { on: "OPEN", off: "SHUT" } as const;
const FIGURE: Partial<Record<BinarySensorClass, { on?: string; off?: string }>> = {
  door: OPEN_SHUT, garage_door: OPEN_SHUT, opening: OPEN_SHUT, window: OPEN_SHUT,
  moisture: { on: "WET", off: "DRY" },
  smoke: { on: "SMOKE", off: "OK" },
  gas: { on: "GAS", off: "OK" },
  carbon_monoxide: { on: "CO", off: "OK" },
  battery: { on: "LOW", off: "OK" },
  cold: { on: "COLD", off: "OK" },
  heat: { on: "HOT", off: "OK" },
  presence: { on: "HOME", off: "AWAY" },
  motion: { off: "OK" }, occupancy: { off: "OK" }, sound: { off: "OK" }, vibration: { off: "OK" }, tamper: { off: "OK" }, problem: { off: "OK" },
};

const figureOf = (deviceClass: BinarySensorClass | undefined, on: boolean): string =>
  (deviceClass && FIGURE[deviceClass]?.[on ? "on" : "off"]) ?? (on ? "ON" : "OFF");

/**
 * One binary sensor (a door, a window, a leak, smoke), with its device's battery, as a field module: a reading, so
 * nothing on it is pressed but its name. Where a control has its key and fader, it has its glyph, the picture its
 * device class names, on a flat plate, and today's meter of the hours it was on. The screen says the state in its
 * class's words at four places (OPEN, SHUT, WET, CO; OK for a clear detector) beside its picture, lit while on; the
 * meta lines the full word and since when. Its warnings take their severity (`binarySensorSeverity`, the state's first): smoke, gas and carbon monoxide are an alarm, the
 * whole screen inverted and on the alert line; a leak is urgent, an inverted block on the screen and the alert line;
 * a garage door left open is advisory, on the screen behind the marker (Open, since when under it), as the cover's is; a low
 * battery is advisory, the device's, on the plate in place of the area. An open door is a state, not a warning.
 */
export function BinarySensorModule({ entity: e, history, footprint = "standard", defaultOpen = false }: BinarySensorModuleProps) {
  const details = useDetails(defaultOpen);
  const now = useNow();
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const compact = footprint === "compact";
  const word = stateWord(e);
  const words = wordsOf(e.deviceClass);
  const picture = pictureOf(e.deviceClass);
  const since = sinceFact(e.lastChanged);

  // The state's own warning is about the reading: it stays on the screen. A low battery is the device's: the plate.
  const stateLevel = stateSeverity(e);
  // The screen says the warning's word over since when; a row, with no meta lines, says both on one ("Open since 18:30").
  const said = stateLevel ? alertWord(e) : undefined;
  const lowBattery = !unav && isLowBattery(e.battery) ? batteryText(e.battery) : undefined;
  const battery = !stateLevel ? lowBattery : undefined;

  const pict = <Pictogram param="neutral" lit={on}>{BINARY_SENSOR_PICT[picture]}</Pictogram>;
  // In a row, an alarm's screen says how long ago it went off, which can't be mistaken for the state, as the alarm's does.
  const ago = e.changedAt != null ? Math.floor((now.getTime() - e.changedAt) / 60_000) : undefined;
  const read: ReactNode = unav ? <Blank places={4} label="Unavailable" />
    : stateLevel === "alarm" && compact ? (ago != null ? <><span className="fd-sr">{word}, </span>{ago < 1 ? "NOW" : fmtAgo(ago)}</> : <Blank places={4} label={word} />)
    : <><span aria-hidden="true">{figureOf(e.deviceClass, on)}</span><span className="fd-sr">{word}</span></>;
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? lastSeenFact(e.lastSeen) : undefined]
    // The figure is the alarm (SMOKE, GAS, CO): its first line says it was detected, as the alarm's names its cause.
    : stateLevel === "alarm" ? [`${words.today.charAt(0).toUpperCase()}${words.today.slice(1)}`, since]
    : stateLevel === "urgent" ? [<Warn key="w" block>{said}</Warn>, since]
    : stateLevel ? [<Warn key="w">{said}</Warn>, since]
    : [word, since];
  // An alarm and an urgent warning are pressing: the alert line names them, the module's name opening its details.
  const pressing = stateLevel === "alarm" || stateLevel === "urgent" ? stateLevel : undefined;
  const spoken = e.deviceClass ? ALERT_SPOKEN[e.deviceClass] : undefined;
  const alert = pressing && said
    ? { level: pressing, what: said, startedAt: pressing === "alarm" ? e.changedAt : undefined, ...(pressing === "alarm" && { say: `Alarm: ${e.name}, ${(spoken ?? said).toLowerCase()}.` }) }
    : undefined;
  // A row has no meta lines: the state's warning takes the area's line, a pressing one in its block, as the cover's does.
  const warning = compact && stateLevel ? alertText(e) : battery;

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
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: e.battery != null && !unav ? batteryText(e.battery) : "" }}
    >
      {history && <Today summary={summary} label={label} tone="neutral" samples={history.samples} currentHour={history.currentHour} />}
      {lowBattery && <p className="fd-hint"><Warn>{batteryAdvice(e.battery!)}</Warn></p>}
    </ModuleFrame>
  );
}

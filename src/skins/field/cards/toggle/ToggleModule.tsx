import type { ReactNode } from "react";
import type { DurationOption, ToggleEntity, ToggleHistory } from "@dashhaus/core/entities/toggle/types";
import { DEFAULT_DURATIONS } from "@dashhaus/core/entities/toggle/durations";
import { toggleKind, toggleWord } from "@dashhaus/core/entities/toggle/words";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { EITHER_WAY, EITHER_WAY_LEGEND, eitherWay, eitherWayHint } from "@dashhaus/core/entities/assumed";
import { Blank, Key, ModuleFrame, Option, Pictogram, Today, useDetails, KeyGroup, Channel } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { CLOCK, IconMode, modePict } from "./icons";
import "./ToggleModule.css";

export interface ToggleModuleProps {
  entity: ToggleEntity;
  footprint?: FieldFootprint;
  /** Today, for the detail panel. Omit to leave the panel without it. */
  history?: ToggleHistory;
  onToggle: () => void;
  /** While its state is assumed or unknown (`eitherWay`): turn it on, or off, whatever it shows. The panel's Turn keys. */
  onTurnOn?: () => void;
  onTurnOff?: () => void;
  /** Turn on (or keep on) with one of `durations`. Omit and the panel has no duration keys. */
  onTurnOnFor?: (value: string) => void;
  /** The panel's ways to turn it on. Default: 30 min, 1 hour, until morning, until off. */
  durations?: DurationOption[];
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/**
 * A mode you switch on and off (Do Not Disturb, Quiet, Guest) as a field module: one input_boolean or switch.
 * The key carries the mode's glyph and switches it; its LED says it's on, and the screen agrees with the mode's
 * pictogram lit and ON. The meta lines say until when, or since when. A mode sets no parameter, so nothing on it
 * wears a parameter's colour, and the entity's own colour isn't drawn. The name, or a press and hold on the key,
 * opens the detail panel: what the mode does, ways to turn it on for a while, and today.
 */
export function ToggleModule({ entity: e, footprint = "standard", history, onToggle, onTurnOn, onTurnOff, onTurnOnFor, durations = DEFAULT_DURATIONS, defaultOpen = false }: ToggleModuleProps) {
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // Reachable but not reported yet: it switches like an off one, and its screen has no reading.
  const unknown = e.state === "unknown";

  const pict = <Pictogram param="neutral" lit={on}>{modePict(e.icon)}</Pictogram>;
  const read: ReactNode = unav ? <Blank label="Unavailable" /> : unknown ? <Blank label="Unknown" /> : on ? "ON" : "OFF";
  const since = sinceFact(e.lastChanged);
  const meta: [ReactNode, ReactNode?] | undefined = unav ? ["Unavailable", e.lastSeen ? lastSeenFact(e.lastSeen) : undefined]
    : unknown ? ["Unknown", since]
    : on && e.until ? [`Until ${e.until}`, since]
    : since ? [since]
    : undefined;
  // Square at the head of a compact row; across the row in a module and the panel, with its state word.
  const key = (wide: boolean) => (
    <Key label={e.name} pressed={on} unavailable={unav} onPress={onToggle} onHold={details.openDetails} wide={wide} caption={wide && !unav ? toggleWord(e) : undefined}>
      <IconMode icon={e.icon} />
    </Key>
  );

  // The panel's content: the screen, with when it switches itself off on its second channel; the key; what the mode
  // does; a key per way to turn it on, the one it was turned on with chosen; today; and facts.
  const chosen = on ? durations.find((d) => d.value === e.duration) : undefined;
  const today = history && (unav ? "Unavailable" : todaySummary("on", history.onMinutes));

  const aside = on && e.until ? (
    <Channel pict={<Pictogram lit param="neutral">{CLOCK}</Pictogram>} sub="Turns off">{e.until}</Channel>
  ) : undefined;

  return (
    <ModuleFrame
      kind="fd-tw"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={key(false)}
      controls={() => key(true)}
      aside={aside}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: toggleKind(e) }}
    >
      {e.description && <p className="fd-hint">{e.description}</p>}

      {eitherWay(e) && onTurnOn && onTurnOff && (
        <div className="fd-block">
          <KeyGroup legend={EITHER_WAY_LEGEND} columns={2}>
            {EITHER_WAY.map((w) => <Key key={w.value} label={`${e.name}, turn ${w.label.toLowerCase()}`} wide caption={w.label} onPress={w.value === "on" ? onTurnOn : onTurnOff}>{null}</Key>)}
          </KeyGroup>
          <p className="fd-hint">{eitherWayHint(e)}</p>
        </div>
      )}

      {onTurnOnFor && durations.length > 0 && (
        <KeyGroup legend={on ? "Keep on" : "Turn on for"} value={chosen?.label} columns={2} className="fd-tw-durations">
          {durations.map((d) => (
            <Option key={d.value} name={d.sub}>
              <Key label={d.sub ? `${d.label}, ${d.sub}` : d.label} wide caption={d.label} chosen={d === chosen} disabled={unav} onPress={() => onTurnOnFor(d.value)}>{null}</Key>
            </Option>
          ))}
        </KeyGroup>
      )}

      {history && <Today summary={today} label="On by hour today." tone="neutral" samples={history.samples} currentHour={history.currentHour} />}
    </ModuleFrame>
  );
}


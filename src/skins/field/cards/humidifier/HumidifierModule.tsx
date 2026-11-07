import { useId } from "react";
import type { ReactNode } from "react";
import type { HumidifierEntity, HumidifierHistory } from "@dashhaus/core/entities/humidifier/types";
import { ACTION_LABEL, fmtHumidity, humidifierFacts, modeLabel, targetVerb } from "@dashhaus/core/entities/humidifier/labels";
import { lastChangedFact, lastSeenFact, nowText } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { Blank, Digits, Fader, Key, Legend, ModuleFrame, Pictogram, Steps, Today, useDetails, KeyGroup, choices, ModuleRow, Channel } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { DROP, IconHumidifier } from "./icons";
import "./HumidifierModule.css";

export interface HumidifierModuleProps {
  entity: HumidifierEntity;
  footprint?: FieldFootprint;
  /** Today, for the detail panel. Omit to leave the panel without it. */
  history?: HumidifierHistory;
  onToggle: () => void;
  /** Set the target humidity, whole percent. Omit, or a unit with no target, and there is no fader. */
  onTargetChange?: (humidity: number) => void;
  /** Omit, or a unit with one mode or none, and the panel has no mode keys. */
  onModeChange?: (mode: string) => void;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/** HA sets humidity in whole percent. */
const STEP = 1;

/** A humidity in its three fixed places: the leading digits unlit, read as the bare number. */
const Humidity = ({ value }: { value: number }) => <><Digits value={value} /><small>%</small></>;

/**
 * One humidifier or dehumidifier as a field module. The key switches it and its LED says it's on. The screen leads
 * with the room's humidity beside a drop filled to the target, in the target's colour, the fader thumb's; the meta
 * lines say what the target does ("Humidify to 45%", "Dry to 50%") and what the unit is doing. While on with a
 * target, the fader sets it; off, the key spans the row to turn it on. The name, or a press and hold on the key,
 * opens the detail panel: exact steps, modes, today.
 */
export function HumidifierModule({ entity: e, footprint = "standard", history, onToggle, onTargetChange, onModeChange, defaultOpen = false }: HumidifierModuleProps) {
  const uid = useId();
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const verb = targetVerb(e.kind);
  const target = on ? e.targetHumidity : undefined;
  const adjustable = target != null && onTargetChange != null;

  // The drop fills to the target it is set to, else to the room's humidity; it lights only while on.
  const focus = target ?? e.currentHumidity;
  const pict = <Pictogram level={focus == null ? 1 : focus / 100} lit={on} param={target != null ? "a" : "neutral"}>{DROP}</Pictogram>;
  const read: ReactNode = unav ? <Blank label="Unavailable" />
    : !on ? "OFF"
    : e.currentHumidity != null ? <Humidity value={e.currentHumidity} />
    : "ON";

  const room = e.currentHumidity != null ? nowText(`${fmtHumidity(e.currentHumidity)}%`) : undefined;
  const doing = e.action && e.action !== "off" ? ACTION_LABEL[e.action] : undefined;
  const mode = e.mode ? modeLabel(e.mode) : undefined;
  const meta: [ReactNode, ReactNode?] = unav ? ["Unavailable", e.lastSeen ? lastSeenFact(e.lastSeen) : undefined]
    : !on ? ["Off", room]
    : target != null ? [`${verb} ${fmtHumidity(target)}%`, doing ?? mode]
    : [mode ?? "On", doing];

  const openPanel = details.openDetails;
  // The key says what pressing it does; its LED says it's on, and the screen says the mode it runs in.
  const keyLabel = `${e.name}, ${unav ? "unavailable" : on ? "turn off" : "turn on"}`;
  // The power key and the target fader, the same in the module and the panel. Without a target to set, the key
  // spans the row with what it does.
  const controls = (where: "m" | "p") => (
    <ModuleRow className="fd-hu-row" solo={!adjustable}>
      <Key label={keyLabel} led={on} unavailable={unav} onPress={onToggle} onHold={openPanel} wide={!adjustable} caption={adjustable || unav ? undefined : on ? "Turn off" : "Turn on"}>
        <IconHumidifier kind={e.kind} />
      </Key>
      {adjustable && (
        <Fader
          id={`${uid}-${where}`}
          label={`${e.name} target humidity`}
          legend={`${verb} ${fmtHumidity(target)}%`}
          value={target}
          min={e.minHumidity}
          max={e.maxHumidity}
          step={STEP}
          lit={on}
          valueText={`${fmtHumidity(target)} percent`}
          onChange={onTargetChange}
        />
      )}
    </ModuleRow>
  );

  // The panel's content: the screen with a second channel (the target while on, the room while off), the controls,
  // exact target steps, the unit's modes, today, and facts.
  const today = history && (unav ? "Unavailable" : todaySummary("on", history.onMinutes));

  const aside = unav ? (
    <Channel sub="Unavailable"><Blank label="Unavailable" /></Channel>
  ) : !on ? (
    <Channel pict={<Pictogram lit={false}>{DROP}</Pictogram>} sub="Room">
      {e.currentHumidity != null ? <Humidity value={e.currentHumidity} /> : <Blank label="No room humidity" />}
    </Channel>
  ) : target != null ? (
    <Channel pict={<Pictogram lit level={target / 100}>{DROP}</Pictogram>} sub={verb}><Humidity value={target} /></Channel>
  ) : e.mode ? (
    <Channel name={modeLabel(e.mode)} sub="Mode" />
  ) : undefined;

  const down = target == null ? undefined : Math.max(e.minHumidity, Math.round(target) - STEP);
  const up = target == null ? undefined : Math.min(e.maxHumidity, Math.round(target) + STEP);
  const modes = e.modes ?? [];

  return (
    <ModuleFrame
      kind="fd-hu"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={<Key label={keyLabel} led={on} unavailable={unav} onPress={onToggle} onHold={openPanel}><IconHumidifier kind={e.kind} /></Key>}
      controls={controls}
      aside={aside}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: humidifierFacts(e, unav) }}
    >
      {adjustable && onTargetChange && target != null && down != null && up != null && (
        <div className="fd-block">
          <Legend>Fine target</Legend>
          <Steps
            group={`${e.name}, ${verb.toLowerCase()}`}
            label={verb}
            value={`${fmtHumidity(target)}%`}
            downLabel={`Lower target to ${down}%`}
            upLabel={`Raise target to ${up}%`}
            atMin={down === Math.round(target)}
            atMax={up === Math.round(target)}
            onDown={() => onTargetChange(down)}
            onUp={() => onTargetChange(up)}
          />
        </div>
      )}

      {!unav && onModeChange && modes.length > 1 && (
        <KeyGroup legend="Mode" value={e.mode ? modeLabel(e.mode) : undefined} columns={choices(modes.length)} narrow={2}>
          {modes.map((m) => <Key key={m} label={`Set mode to ${modeLabel(m)}`} wide caption={modeLabel(m)} chosen={m === e.mode} onPress={() => onModeChange(m)}>{null}</Key>)}
        </KeyGroup>
      )}

      {history && <Today summary={today} label="On by hour today." tone="neutral" samples={history.samples} currentHour={history.currentHour} />}

      {/* Unavailable, the bounds are the mapper's defaults rather than the unit's, so only its kind is printed. */}
    </ModuleFrame>
  );
}


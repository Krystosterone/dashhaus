import { useId } from "react";
import type { ReactNode } from "react";
import type { FanDirection, FanEntity, FanHistory } from "@dashhaus/core/entities/fan/types";
import { namedSpeeds, percentOf, speedOf } from "@dashhaus/core/entities/fan/speed";
import { DIRECTION_LABEL, fanAbilities, fanMode, presetLabel, speedValueText } from "@dashhaus/core/entities/fan/labels";
import { lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { Blank, Digits, Fader, Key, KeyGroup, ModuleFrame, ModuleRow, Option, Pictogram, Today, choices, useDetails, Channel } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { FAN_PICT, IconFan, IconSweep, IconTurn } from "./icons";
import "./FanModule.css";

export interface FanModuleProps {
  entity: FanEntity;
  footprint?: FieldFootprint;
  /** Today, for the detail panel. Omit to leave its meter dark. */
  history?: FanHistory;
  onToggle: () => void;
  /** The speed fader, in percent. Omit, or a fan without speeds, and the key spans the row. */
  onPercentageChange?: (percent: number) => void;
  /** Panel: the preset keys. */
  onPresetChange?: (preset: string) => void;
  /** Panel: the oscillation key. */
  onOscillateChange?: (oscillating: boolean) => void;
  /** Panel: a ceiling fan's direction keys. */
  onDirectionChange?: (direction: FanDirection) => void;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

const DIRECTIONS: FanDirection[] = ["forward", "reverse"];

/**
 * One fan as a field module. The key switches it and its LED says it's on. The screen's fan fills with the speed,
 * in the fader's colour; beside it the figure (a stepped fan's step, 2/3, or a stepless one's percent), then its
 * preset or sweep, and since when. The fader sets the speed, one stop per speed, and sliding it while off turns the fan on. A fan without
 * speeds has one wide key with its state word. The name, or a press and hold on the key, opens the detail panel:
 * presets, oscillation, direction, today.
 */
export function FanModule({ entity: e, footprint = "standard", history, onToggle, onPercentageChange, onPresetChange, onOscillateChange, onDirectionChange, defaultOpen = false }: FanModuleProps) {
  const uid = useId();
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const count = e.speedCount ?? 0;
  const speedy = !!(e.supportsSpeed && count >= 2);
  // Off, the fan reports no speed: the fader has no thumb, and a tap or a slide turns it on where it lands.
  const speed = on && e.percentage != null && speedy ? speedOf(e.percentage, count) : null;
  const pct = speed == null ? null : percentOf(speed, count);

  // A fan with a few speeds reads its step, as its own buttons are numbered (2/3); a stepless one its percent (040%).
  const named = namedSpeeds(count);
  const read: ReactNode = unav ? <Blank label="Unavailable" />
    : !on ? "OFF"
    : speed != null && named ? <><Digits value={speed} places={1} /><small aria-hidden="true">/{count}</small><span className="fd-sr"> of {count}</span></>
    : pct != null ? <><Digits value={pct} /><small>%</small></>
    : "ON";
  const first = fanMode(e);
  const since = unav ? (e.lastSeen ? `Seen ${e.lastSeen}` : undefined) : sinceFact(e.lastChanged);
  const meta: [string, string?] | undefined = unav ? ["Unavailable", since] : first ? [first, since] : since ? [since] : undefined;

  // The hub always lights while on, so the first of three speeds still reads lit; the blades fill with the speed.
  const pict = <Pictogram level={pct != null ? 0.25 + 0.75 * (pct / 100) : 1} lit={on}>{FAN_PICT}</Pictogram>;
  const openPanel = details.openDetails;
  // The power key and the speed fader, the same in the module and the panel. Unavailable, the speed isn't known, so
  // the fader goes and the key spans the row, as every field control's does.
  const faded = speedy && !unav && !!onPercentageChange;
  const at = speed ?? 1;
  const controls = (where: "m" | "p") => (
    <ModuleRow className="fd-fn-row" solo={!faded}>
      <Key label={e.name} pressed={on} unavailable={unav} onPress={onToggle} onHold={openPanel} wide={!faded} caption={!faded && !unav ? (on ? "On" : "Off") : undefined}>
        <IconFan />
      </Key>
      {faded && (
        <Fader
          id={`${uid}-${where}`}
          label={`${e.name} speed`}
          legend="Speed"
          value={at}
          min={1}
          max={count}
          lit={on}
          empty={speed == null}
          valueText={speedValueText(at, count, on)}
          onChange={(next) => onPercentageChange?.(percentOf(next, count))}
        />
      )}
    </ModuleRow>
  );

  // The panel's content: the screen with a second channel (a ceiling fan's direction), the controls, the presets, the
  // oscillation key, the direction keys, today, and facts.
  const today = history && (unav ? "Unavailable" : todaySummary("on", history.onMinutes));
  const presets = e.supportsPreset ? e.presetModes ?? [] : [];

  // Unavailable, the screen keeps the module's meta lines: "Unavailable" and when it was last seen.
  const aside = !unav && e.supportsDirection ? (
    <Channel name={e.direction ? DIRECTION_LABEL[e.direction] : <Blank places={3} label="Direction not reported" />} sub="Direction" />
  ) : undefined;

  return (
    <ModuleFrame
      kind="fd-fn"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={<Key label={e.name} pressed={on} unavailable={unav} onPress={onToggle} onHold={openPanel}><IconFan /></Key>}
      controls={controls}
      aside={aside}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: fanAbilities(e) }}
    >
      {presets.length > 0 && onPresetChange && (
        <KeyGroup legend="Preset" value={e.presetMode ? presetLabel(e.presetMode) : undefined} columns={choices(presets.length)} narrow={2}>
          {presets.map((p) => (
            <Key key={p} label={`Set preset to ${presetLabel(p)}`} wide caption={presetLabel(p)} chosen={p === e.presetMode} disabled={unav} onPress={() => onPresetChange(p)}>{null}</Key>
          ))}
        </KeyGroup>
      )}

      {/* The oscillation key latches, half the panel's width, so it reads as one key and not a bar. */}
      {e.supportsOscillate && onOscillateChange && (
        <KeyGroup legend="Oscillation" columns={2}>
          <Key label="Oscillate" pressed={e.oscillating === true} unavailable={unav || e.oscillating == null} wide caption={unav || e.oscillating == null ? undefined : e.oscillating ? "On" : "Off"} onPress={() => onOscillateChange(!e.oscillating)}>
            <IconSweep />
          </Key>
        </KeyGroup>
      )}

      {e.supportsDirection && onDirectionChange && (
        <KeyGroup legend="Direction" value={e.direction ? DIRECTION_LABEL[e.direction] : undefined} columns={2}>
          {DIRECTIONS.map((d) => (
            <Option key={d} name={DIRECTION_LABEL[d]}>
              <Key label={`Turn ${DIRECTION_LABEL[d].toLowerCase()}`} wide chosen={d === e.direction} disabled={unav} onPress={() => onDirectionChange(d)}>
                <IconTurn direction={d} />
              </Key>
            </Option>
          ))}
        </KeyGroup>
      )}

      {history && <Today summary={today} label="On by hour today." tone="neutral" samples={history.samples} currentHour={history.currentHour} />}
    </ModuleFrame>
  );
}


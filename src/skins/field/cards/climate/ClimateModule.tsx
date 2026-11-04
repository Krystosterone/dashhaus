import { useId } from "react";
import type { ReactNode } from "react";
import type { ClimateEntity, ClimateHistory, HvacMode } from "@dashhaus/core/entities/climate/types";
import { ACTION_LABEL, MODE_META, fmtCurrent, fmtTarget, orderedRange, titleCase } from "@dashhaus/core/entities/climate/modes";
import { lastChangedFact, lastSeenFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { Blank, Fader, Key, Legend, ModuleFrame, Option, Pictogram, RangeFader, Steps, Today, useDetails, KeyGroup, choices, Temperature, ModuleRow, Channel } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { ModeIcon, ModeShape, ThermostatIcon } from "./icons";
import "./ClimateModule.css";

export interface ClimateModuleProps {
  entity: ClimateEntity;
  footprint?: FieldFootprint;
  /** Today, for the detail panel. Omit to leave the panel without it. */
  history?: ClimateHistory;
  onToggle: () => void;
  onTargetChange: (temperature: number) => void;
  onRangeChange?: (low: number, high: number) => void;
  onModeChange?: (mode: HvacMode) => void;
  onPresetChange?: (preset: string) => void;
  onFanChange?: (fan: string) => void;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

function targetCopy(e: ClimateEntity, mode: HvacMode) {
  if (mode === "heat_cool" && e.targetLow != null && e.targetHigh != null) {
    return { value: `${fmtTarget(e.targetLow)}–${fmtTarget(e.targetHigh)}°`, label: "Keep" };
  }
  if (e.targetTemperature != null && (mode === "heat" || mode === "cool" || mode === "auto")) {
    const label = mode === "heat" ? "Heat to" : mode === "cool" ? "Cool to" : "Target";
    return { value: `${fmtTarget(e.targetTemperature)}°`, label };
  }
  return undefined;
}

/**
 * One climate entity as Field hardware. The key switches it, the screen leads with room temperature, and the
 * target lives on a fader (or an ordered two-thumb range). Details carry exact steps, modes, presets, fan and today.
 */
export function ClimateModule({ entity: e, footprint = "standard", history, onToggle, onTargetChange, onRangeChange, onModeChange, onPresetChange, onFanChange, defaultOpen = false }: ClimateModuleProps) {
  const uid = useId();
  const details = useDetails(defaultOpen);
  const unavailable = e.state === "unavailable";
  const mode: HvacMode = e.state === "unavailable" ? "off" : e.state;
  const on = !unavailable && mode !== "off";
  const action = e.hvacAction ?? (on ? "idle" : "off");
  const target = targetCopy(e, mode);
  const hasRange = on && mode === "heat_cool" && e.targetLow != null && e.targetHigh != null && onRangeChange != null;
  const hasSingle = on && e.targetTemperature != null && (mode === "heat" || mode === "cool" || mode === "auto");
  const openPanel = details.openDetails;
  const lastMode = e.hvacModes.find((candidate) => candidate !== "off") ?? "heat";
  const pictMode = on ? mode : lastMode;

  const focus = hasRange ? (e.targetLow! + e.targetHigh!) / 2 : hasSingle ? e.targetTemperature! : e.currentTemperature;
  const level = focus == null ? 1 : Math.min(1, Math.max(0, (focus - e.minTemp) / Math.max(e.step, e.maxTemp - e.minTemp)));
  // A mode with no target (dry, fan only) sets no parameter, so its pictogram lights in the figure's ink.
  const pict = <Pictogram level={level} lit={on} param={hasSingle || hasRange || !on ? "a" : "neutral"}><ModeShape mode={pictMode} /></Pictogram>;

  const read: ReactNode = unavailable ? <Blank places={4} label="Unavailable" />
    : !on ? "OFF"
    : e.currentTemperature != null ? <Temperature value={e.currentTemperature} unit={e.unit} />
    : mode === "dry" ? "DRY"
    : mode === "fan_only" ? "FAN"
    : <Blank places={4} label="No temperature reading" />;

  const seen = e.lastSeen ? `Seen ${e.lastSeen}` : undefined;
  const room = e.currentTemperature != null ? `${fmtCurrent(e.currentTemperature)}${e.unit} room` : undefined;
  const meta: [ReactNode, ReactNode?] = unavailable
    ? ["Unavailable", seen]
    : !on
      ? ["Off", room]
      : [target ? `${target.label} ${target.value}` : MODE_META[mode].label, ACTION_LABEL[action]];

  const setRange = onRangeChange ? (low: number, high: number) => {
    const [orderedLow, orderedHigh] = orderedRange(low, high);
    onRangeChange(orderedLow, orderedHigh);
  } : undefined;
  const unitWord = e.unit === "°F" ? "degrees Fahrenheit" : "degrees Celsius";

  const controls = (where: "m" | "p") => {
    const adjustable = hasSingle || hasRange;
    // The key says what pressing it does; the screen says the mode it runs in.
    const caption = unavailable ? undefined : on ? "Turn off" : "Turn on";
    return (
      <ModuleRow className="fd-cl-row" solo={!adjustable}>
        <Key
          label={`${e.name}, ${unavailable ? "unavailable" : on ? "turn off" : "turn on"}`}
          led={on}
          unavailable={unavailable}
          onPress={onToggle}
          onHold={openPanel}
          wide={!adjustable}
          caption={!adjustable ? caption : undefined}
        >
          <ThermostatIcon />
        </Key>
        {hasSingle && (
          <Fader
            id={`${uid}-${where}-target`}
            label={`${e.name} target temperature`}
            legend={`${target?.label ?? "Target"} ${target?.value ?? ""}`.trim()}
            value={e.targetTemperature}
            min={e.minTemp}
            max={e.maxTemp}
            step={e.step}
            lit={on}
            valueText={`${fmtTarget(e.targetTemperature!)} ${unitWord}`}
            onChange={onTargetChange}
          />
        )}
        {hasRange && setRange && (
          <RangeFader
            id={`${uid}-${where}-range`}
            name={e.name}
            legend={`Keep ${target?.value ?? ""}`.trim()}
            low={e.targetLow!}
            high={e.targetHigh!}
            min={e.minTemp}
            max={e.maxTemp}
            step={e.step}
            lowValueText={`Heat below ${fmtTarget(e.targetLow!)} ${unitWord}`}
            highValueText={`Cool above ${fmtTarget(e.targetHigh!)} ${unitWord}`}
            onChange={setRange}
          />
        )}
      </ModuleRow>
    );
  };

  const targetPictMode = on ? mode : (e.hvacModes.find((candidate) => candidate !== "off") ?? "heat");
  const aside = unavailable ? (
    <Channel sub="Unavailable"><Blank places={4} label="Unavailable" /></Channel>
  ) : !on ? (
    <Channel pict={<Pictogram lit={false}><ModeShape mode={targetPictMode} /></Pictogram>} sub="Room">
      {e.currentTemperature != null ? <Temperature value={e.currentTemperature} unit={e.unit} /> : <Blank places={4} label="No room temperature" />}
    </Channel>
  ) : (
    <Channel
      pict={<Pictogram lit={target != null} param={mode === "heat_cool" ? "b" : "a"}><ModeShape mode={targetPictMode} /></Pictogram>}
      name={target?.value ?? MODE_META[mode].label}
      sub={target ? `${target.label} target` : "Mode"}
    />
  );
  const modeOptions = e.hvacModes.filter((candidate) => candidate !== "off");
  const today = !history ? undefined
    : unavailable ? "Unavailable"
    : todaySummary(history.activity, history.activeMinutes);

  return (
    <ModuleFrame
      kind="fd-cl"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={(
        <Key label={`${e.name}, ${unavailable ? "unavailable" : on ? "turn off" : "turn on"}`} led={on} unavailable={unavailable} onPress={onToggle} onHold={openPanel}>
          <ThermostatIcon />
        </Key>
      )}
      controls={controls}
      aside={aside}
      facts={{ start: unavailable ? lastSeenFact(e.lastSeen) : e.currentHumidity != null ? `Humidity ${Math.round(e.currentHumidity)}%` : "", end: unavailable ? "" : [lastChangedFact(e.lastChanged), `${fmtTarget(e.minTemp)}–${fmtTarget(e.maxTemp)}${e.unit}`].filter(Boolean).join(" · ") }}
    >
      {hasSingle && onTargetChange && target && e.targetTemperature != null && (
        <TargetFine name={e.name} label={target.label} value={e.targetTemperature} min={e.minTemp} max={e.maxTemp} step={e.step} onChange={onTargetChange} />
      )}

      {on && mode === "heat_cool" && e.targetLow != null && e.targetHigh != null && setRange && (
        <RangeFine
          name={e.name}
          low={e.targetLow}
          high={e.targetHigh}
          min={e.minTemp}
          max={e.maxTemp}
          step={e.step}
          onChange={setRange}
        />
      )}

      {!unavailable && onModeChange && modeOptions.length > 0 && (
        <ModeKeys current={mode} options={modeOptions} onChange={onModeChange} />
      )}
      {!unavailable && onPresetChange && e.presetModes && e.presetModes.length > 0 && (
        <TextKeys label="Preset" current={e.presetMode} options={e.presetModes} onChange={onPresetChange} />
      )}
      {!unavailable && onFanChange && e.fanModes && e.fanModes.length > 0 && (
        <TextKeys label="Fan" current={e.fanMode} options={e.fanModes} onChange={onFanChange} />
      )}

      {history && <Today summary={today} label="Climate activity by hour today." tone="neutral" samples={history.samples} currentHour={history.currentHour} />}
    </ModuleFrame>
  );
}

/** A step from `value`, kept within its bounds and off floating-point noise. */
const stepped = (value: number, by: number, lo: number, hi: number) => Number(Math.min(hi, Math.max(lo, value + by)).toFixed(4));

function TargetFine({ name, label, value, min, max, step, onChange }: { name: string; label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  const down = stepped(value, -step, min, max);
  const up = stepped(value, step, min, max);
  return (
    <div className="fd-block">
      <Legend>Fine target</Legend>
      <Steps
        group={`${name}, ${label.toLowerCase()}`}
        label={label}
        value={`${fmtTarget(value)}°`}
        downLabel={`Lower target to ${fmtTarget(down)}°`}
        upLabel={`Raise target to ${fmtTarget(up)}°`}
        atMin={down === value}
        atMax={up === value}
        onDown={() => onChange(down)}
        onUp={() => onChange(up)}
      />
    </div>
  );
}

function RangeFine({ name, low, high, min, max, step, onChange }: { name: string; low: number; high: number; min: number; max: number; step: number; onChange: (low: number, high: number) => void }) {
  // The thresholds never cross: heat's ceiling is cool's threshold, and cool's floor is heat's.
  const lowDown = stepped(low, -step, min, high);
  const lowUp = stepped(low, step, min, high);
  const highDown = stepped(high, -step, low, max);
  const highUp = stepped(high, step, low, max);
  return (
    <div className="fd-block">
      <Legend>Fine range</Legend>
      <div className="fd-cl-fine">
        <Steps
          group={`${name}, heat below`}
          label="Heat below"
          value={`${fmtTarget(low)}°`}
          downLabel={`Lower heat threshold to ${fmtTarget(lowDown)}°`}
          upLabel={`Raise heat threshold to ${fmtTarget(lowUp)}°`}
          atMin={lowDown === low}
          atMax={lowUp === low}
          onDown={() => onChange(lowDown, high)}
          onUp={() => onChange(lowUp, high)}
        />
        <Steps
          group={`${name}, cool above`}
          label="Cool above"
          value={`${fmtTarget(high)}°`}
          downLabel={`Lower cool threshold to ${fmtTarget(highDown)}°`}
          upLabel={`Raise cool threshold to ${fmtTarget(highUp)}°`}
          atMin={highDown === high}
          atMax={highUp === high}
          onDown={() => onChange(low, highDown)}
          onUp={() => onChange(low, highUp)}
        />
      </div>
    </div>
  );
}

function ModeKeys({ current, options, onChange }: { current: HvacMode; options: HvacMode[]; onChange: (mode: HvacMode) => void }) {
  return (
    <KeyGroup legend="Mode" value={MODE_META[current].label} columns={choices(options.length)} narrow={2}>
      {options.map((option) => (
        <Option key={option} name={MODE_META[option].label}>
          <Key label={`Set mode to ${MODE_META[option].label}`} wide chosen={option === current} onPress={() => onChange(option)}><ModeIcon mode={option} /></Key>
        </Option>
      ))}
    </KeyGroup>
  );
}

function TextKeys({ label, current, options, onChange }: { label: string; current?: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <KeyGroup legend={label} value={current ? titleCase(current) : undefined} columns={choices(options.length)} narrow={2}>
      {options.map((option) => {
        const text = titleCase(option);
        return <Key key={option} label={`Set ${label.toLowerCase()} to ${text}`} wide caption={text} chosen={option === current} onPress={() => onChange(option)}>{null}</Key>;
      })}
    </KeyGroup>
  );
}

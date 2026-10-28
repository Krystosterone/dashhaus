import { useId } from "react";
import type { ReactNode } from "react";
import type { ClimateEntity, ClimateHistory, HvacMode } from "../../../../domains/climate/types";
import { ACTION_LABEL, MODE_META, fmtCurrent, fmtTarget, orderedRange, titleCase } from "../../../../domains/climate/modes";
import { fmtDuration } from "../../../../domains/format";
import { Blank, Digits, Fader, Key, Legend, ModuleFrame, Pictogram, RangeFader, Screen, Today, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { MinusIcon, ModeIcon, ModeShape, PlusIcon, ThermostatIcon } from "./icons";
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

/** A fixed-place temperature: visual leading zeroes are CSS-only, while assistive technology hears the real value. */
function Temperature({ value, unit }: { value: number; unit: ClimateEntity["unit"] }) {
  return <><Digits text={fmtCurrent(value)} places={4} /><small>{unit}</small></>;
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
  const pict = <Pictogram level={level} lit={on} param="a"><ModeShape mode={pictMode} /></Pictogram>;

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

  const controls = (where: string) => {
    const adjustable = hasSingle || hasRange;
    const caption = unavailable ? "Unavailable" : !on ? "Turn on" : MODE_META[mode].label;
    return (
      <div className="fd-cl-row" data-adjustable={adjustable}>
        <Key
          label={`${e.name}, ${unavailable ? "unavailable" : on ? "turn off" : "turn on"}`}
          pressed={on}
          disabled={unavailable}
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
      </div>
    );
  };

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
        <Key label={`${e.name}, ${unavailable ? "unavailable" : on ? "turn off" : "turn on"}`} pressed={on} disabled={unavailable} onPress={onToggle} onHold={openPanel}>
          <ThermostatIcon />
        </Key>
      )}
      row={controls("module")}
    >
      <ClimateDetails
        e={e}
        mode={mode}
        on={on}
        unavailable={unavailable}
        read={read}
        pict={pict}
        target={target}
        controls={controls("panel")}
        history={history}
        setRange={setRange}
        onModeChange={onModeChange}
        onPresetChange={onPresetChange}
        onFanChange={onFanChange}
      />
    </ModuleFrame>
  );
}

interface ClimateDetailsProps {
  e: ClimateEntity;
  mode: HvacMode;
  on: boolean;
  unavailable: boolean;
  read: ReactNode;
  pict: ReactNode;
  target?: { value: string; label: string };
  controls: ReactNode;
  history?: ClimateHistory;
  setRange?: (low: number, high: number) => void;
  onModeChange?: (mode: HvacMode) => void;
  onPresetChange?: (preset: string) => void;
  onFanChange?: (fan: string) => void;
}

function ClimateDetails({ e, mode, on, unavailable, read, pict, target, controls, history, setRange, onModeChange, onPresetChange, onFanChange }: ClimateDetailsProps) {
  const uid = useId();
  const targetPictMode = on ? mode : (e.hvacModes.find((candidate) => candidate !== "off") ?? "heat");
  const aside = unavailable ? (
    <p className="fd-chan"><span><Blank places={4} label="Unavailable" /><span className="fd-chan-sub">Unavailable</span></span></p>
  ) : !on ? (
    <p className="fd-chan">
      <Pictogram lit={false}><ModeShape mode={targetPictMode} /></Pictogram>
      <span>{e.currentTemperature != null ? <Temperature value={e.currentTemperature} unit={e.unit} /> : <Blank places={4} label="No room temperature" />}<span className="fd-chan-sub">Room</span></span>
    </p>
  ) : (
    <p className="fd-chan">
      <Pictogram lit={target != null} param={mode === "heat_cool" ? "b" : "a"}><ModeShape mode={targetPictMode} /></Pictogram>
      <span><span className="fd-chan-name">{target?.value ?? MODE_META[mode].label}</span><span className="fd-chan-sub">{target ? `${target.label} target` : "Mode"}</span></span>
    </p>
  );
  const modeOptions = e.hvacModes.filter((candidate) => candidate !== "off");
  const today = !history ? undefined
    : unavailable ? "Unavailable"
    : history.activeMinutes > 0 ? `${titleCase(history.activity)} ${fmtDuration(history.activeMinutes)}`
    : `Not ${history.activity} today`;

  return (
    <div className="fd-cl-panel" data-state={e.state}>
      <Screen pict={pict} aside={aside}>{read}</Screen>
      {controls}

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
        <ModeKeys id={`${uid}-mode`} current={mode} options={modeOptions} onChange={onModeChange} />
      )}
      {!unavailable && onPresetChange && e.presetModes && e.presetModes.length > 0 && (
        <TextKeys id={`${uid}-preset`} label="Preset" current={e.presetMode} options={e.presetModes} onChange={onPresetChange} />
      )}
      {!unavailable && onFanChange && e.fanModes && e.fanModes.length > 0 && (
        <TextKeys id={`${uid}-fan`} label="Fan" current={e.fanMode} options={e.fanModes} onChange={onFanChange} />
      )}

      {history && <Today summary={today} label="Climate activity by hour today." tone="neutral" samples={history.samples} currentHour={history.currentHour} />}

      <p className="fd-info">
        <span>{unavailable ? `Last seen ${e.lastSeen ?? "unknown"}` : e.currentHumidity != null ? `Humidity ${Math.round(e.currentHumidity)}%` : ""}</span>
        <span>{unavailable ? "" : e.lastChanged ? `Changed ${e.lastChanged} · ${fmtTarget(e.minTemp)}–${fmtTarget(e.maxTemp)}${e.unit}` : `${fmtTarget(e.minTemp)}–${fmtTarget(e.maxTemp)}${e.unit}`}</span>
      </p>
    </div>
  );
}

function RangeFine({ name, low, high, min, max, step, onChange }: { name: string; low: number; high: number; min: number; max: number; step: number; onChange: (low: number, high: number) => void }) {
  const nextLowDown = Number(Math.max(min, low - step).toFixed(4));
  const nextLowUp = Number(Math.min(high, low + step).toFixed(4));
  const nextHighDown = Number(Math.max(low, high - step).toFixed(4));
  const nextHighUp = Number(Math.min(max, high + step).toFixed(4));
  return (
    <div className="fd-block">
      <Legend>Fine range</Legend>
      <div className="fd-cl-fine">
        <div className="fd-cl-fine-row" role="group" aria-label={`${name}, heat below`}>
          <span className="fd-cl-fine-label"><span>Heat below</span><b>{fmtTarget(low)}°</b></span>
          <Key label={`Lower heat threshold to ${fmtTarget(nextLowDown)}°`} disabled={nextLowDown === low} onPress={() => onChange(nextLowDown, high)}><MinusIcon /></Key>
          <Key label={`Raise heat threshold to ${fmtTarget(nextLowUp)}°`} disabled={nextLowUp === low} onPress={() => onChange(nextLowUp, high)}><PlusIcon /></Key>
        </div>
        <div className="fd-cl-fine-row" role="group" aria-label={`${name}, cool above`}>
          <span className="fd-cl-fine-label"><span>Cool above</span><b>{fmtTarget(high)}°</b></span>
          <Key label={`Lower cool threshold to ${fmtTarget(nextHighDown)}°`} disabled={nextHighDown === high} onPress={() => onChange(low, nextHighDown)}><MinusIcon /></Key>
          <Key label={`Raise cool threshold to ${fmtTarget(nextHighUp)}°`} disabled={nextHighUp === high} onPress={() => onChange(low, nextHighUp)}><PlusIcon /></Key>
        </div>
      </div>
    </div>
  );
}

function ModeKeys({ id, current, options, onChange }: { id: string; current: HvacMode; options: HvacMode[]; onChange: (mode: HvacMode) => void }) {
  return (
    <div className="fd-block">
      <Legend id={id} value={MODE_META[current].label}>Mode</Legend>
      <div className="fd-cl-mode-keys" role="group" aria-labelledby={id}>
        {options.map((option) => (
          <div key={option} className="fd-cl-option">
            <Key label={`Set mode to ${MODE_META[option].label}`} wide chosen={option === current} onPress={() => onChange(option)}><ModeIcon mode={option} /></Key>
            <span className="fd-cl-option-name" title={MODE_META[option].label}>{MODE_META[option].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextKeys({ id, label, current, options, onChange }: { id: string; label: string; current?: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="fd-block">
      <Legend id={id} value={current ? titleCase(current) : undefined}>{label}</Legend>
      <div className="fd-cl-text-keys" role="group" aria-labelledby={id}>
        {options.map((option) => {
          const text = titleCase(option);
          return <Key key={option} label={`Set ${label.toLowerCase()} to ${text}`} wide caption={text} chosen={option === current} onPress={() => onChange(option)}>{null}</Key>;
        })}
      </div>
    </div>
  );
}

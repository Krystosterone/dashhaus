import type { ClimateEntity, ClimateHistory, HvacMode } from "@dashhaus/core/entities/climate/types";
import { ACTION_LABEL, MODE_META, fmtCurrent, fmtTarget, orderedRange } from "@dashhaus/core/entities/climate/modes";
import { fmtDuration } from "@dashhaus/core/entities/format";
import { FuturaAction, FuturaCardFrame, FuturaDialKey, FuturaReadout, FuturaStats, FuturaStepper } from "../../shared/ui";
import type { FuturaFootprint, FuturaStat, FuturaTone } from "../../shared/ui";
import { IconMode } from "./icons";
import "./FuturaClimateCard.css";

export interface FuturaClimateCardProps {
  entity: ClimateEntity;
  history?: ClimateHistory;
  footprint?: FuturaFootprint;
  defaultOpen?: boolean;
  onToggle?: () => void;
  onTargetChange?: (temperature: number) => void;
  onRangeChange?: (low: number, high: number) => void;
  onModeChange?: (mode: HvacMode) => void;
}

const running = (e: ClimateEntity) => e.hvacAction === "heating" || e.hvacAction === "cooling" || e.hvacAction === "drying" || e.hvacAction === "fan";

/** Amber while it puts heat in (heat mode, or heat/cool heating now); cyan for cooling and everything else. */
export const climateTone = (e: ClimateEntity): FuturaTone => e.hvacAction === "heating" || (e.state === "heat" && e.hvacAction !== "cooling") ? "amber" : "cyan";

/**
 * A thermostat on Futura's console: the dial switches it and its arc is the setpoint across the unit's range;
 * the readout is the room; the stepper sets the target. It glows only while it is actually heating or cooling.
 */
export function FuturaClimateCard({ entity: e, history, footprint = "standard", defaultOpen = false, onToggle, onTargetChange, onRangeChange, onModeChange }: FuturaClimateCardProps) {
  const unavailable = e.state === "unavailable";
  const off = e.state === "off";
  const tone = climateTone(e);
  const lit = running(e);
  const unit = e.unit;
  const range = e.targetLow != null && e.targetHigh != null ? orderedRange(e.targetLow, e.targetHigh) : null;
  const target = range ? range[1] : e.targetTemperature;
  const level = target == null || off ? 0 : (target - e.minTemp) / Math.max(e.step, e.maxTemp - e.minTemp);
  const setpoint = range ? `${fmtTarget(range[0])}–${fmtTarget(range[1])}°` : e.targetTemperature != null ? `${fmtTarget(e.targetTemperature)}°` : null;
  const action = e.hvacAction ? ACTION_LABEL[e.hvacAction] : off ? "Off" : MODE_META[e.state as HvacMode]?.label ?? e.state;
  const status = off ? "Off" : setpoint ? `${action} · ${range ? "holding" : "to"} ${setpoint}` : action;
  const summary = e.currentTemperature != null ? <FuturaReadout value={fmtCurrent(e.currentTemperature)} unit={unit} /> : <FuturaReadout value="—" unit={unit} />;
  const lead = onToggle ? <FuturaDialKey label={`Power, ${e.name}`} pressed={!off && !unavailable} lit={lit} onPress={onToggle} unavailable={unavailable} level={level} tone={tone}><IconMode mode={e.state} /></FuturaDialKey> : undefined;
  const step = (value: number, by: number) => Math.min(e.maxTemp, Math.max(e.minTemp, Number((value + by).toFixed(2))));
  const stepper = (name: string, value: number, set: (next: number) => void, low = e.minTemp, high = e.maxTemp) => (
    <FuturaStepper label={name} value={`${fmtTarget(value)}°`} tone={tone} unavailable={unavailable || off} canDown={value - e.step >= low} canUp={value + e.step <= high} onDown={() => set(step(value, -e.step))} onUp={() => set(step(value, e.step))} />
  );
  const single = !range && e.targetTemperature != null && onTargetChange ? stepper("Target temperature", e.targetTemperature, onTargetChange) : undefined;
  const changed: FuturaStat = e.lastSeen ? { label: "Last seen", value: e.lastSeen } : { label: "Changed", value: e.lastChanged ?? "—" };
  const humidity: FuturaStat[] = e.currentHumidity != null ? [{ label: "Humidity", value: `${Math.round(e.currentHumidity)}%` }] : [];
  const stats: FuturaStat[] = range
    ? [{ label: "Low", value: `${fmtTarget(range[0])}°` }, { label: "High", value: `${fmtTarget(range[1])}°` }, ...humidity]
    : [{ label: "Mode", value: MODE_META[e.state as HvacMode]?.label ?? "—" }, ...humidity, changed];
  const meter = history ? { samples: history.samples, currentHour: history.currentHour, caption: history.activeMinutes > 0 ? `${history.activity === "running" ? "Ran" : history.activity === "heating" ? "Heated" : "Cooled"} ${fmtDuration(history.activeMinutes)}` : "Idle all day", tone: history.activity === "heating" ? "amber" as const : "cyan" as const } : undefined;
  return (
    <FuturaCardFrame name={e.name} area={e.area} state={e.state} summary={summary} icon={<IconMode mode={e.state} />} level={level} tone={tone} lit={lit} lead={lead} status={status} meter={meter} footprint={footprint} actions={off ? undefined : single} stats={stats} defaultOpen={defaultOpen}>
      <div className="futura-controls">
        {single && <div className="futura-control"><span>Target</span>{single}</div>}
        {range && onRangeChange && (
          <>
            <div className="futura-control"><span>Heat to</span>{stepper("Low setpoint", range[0], (low) => onRangeChange(low, range[1]), e.minTemp, range[1])}</div>
            <div className="futura-control"><span>Cool to</span>{stepper("High setpoint", range[1], (high) => onRangeChange(range[0], high), range[0], e.maxTemp)}</div>
          </>
        )}
        {onModeChange && e.hvacModes.length > 1 && (
          <div className="climate-modes" role="group" aria-label={`Mode, ${e.name}`}>
            {e.hvacModes.map((mode) => <FuturaAction key={mode} label={MODE_META[mode]?.label ?? mode} tone={mode === "heat" ? "amber" : "cyan"} pressed={e.state === mode} unavailable={unavailable} onPress={() => onModeChange(mode)} />)}
          </div>
        )}
      </div>
      <FuturaStats facts items={[
        { label: "Room", value: e.currentTemperature != null ? `${fmtCurrent(e.currentTemperature)}${unit}` : "—" },
        { label: "Target", value: setpoint ?? "—" },
        { label: "Mode", value: MODE_META[e.state as HvacMode]?.label ?? "—" },
        { label: "Now", value: e.hvacAction ? ACTION_LABEL[e.hvacAction] : "—" },
        ...humidity,
        ...(e.presetMode ? [{ label: "Preset", value: e.presetMode.replace(/_/g, " ") }] : []),
        ...(e.fanMode ? [{ label: "Fan", value: e.fanMode.replace(/_/g, " ") }] : []),
        { label: "Range", value: `${fmtTarget(e.minTemp)}–${fmtTarget(e.maxTemp)}${unit}` },
        changed,
        { label: "Entity", value: e.entityId },
      ]} />
    </FuturaCardFrame>
  );
}

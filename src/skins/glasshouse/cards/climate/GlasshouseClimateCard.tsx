import { useId } from "react";
import type { ClimateEntity, ClimateHistory, HvacMode } from "@dashhaus/core/entities/climate/types";
import { ACTION_LABEL, MODE_META, fmtCurrent, fmtTarget } from "@dashhaus/core/entities/climate/modes";
import { fmtDuration } from "@dashhaus/core/entities/format";
import { GlasshouseAction, GlasshouseBars, GlasshouseCardFrame, GlasshouseFacts, GlasshouseStep, GlasshouseSwitch } from "../../shared/ui";
import type { GlasshouseFootprint } from "../../shared/ui";
import { IconClimate } from "./icons";
import "./GlasshouseClimateCard.css";

export interface GlasshouseClimateCardProps {
  entity: ClimateEntity;
  history?: ClimateHistory;
  footprint?: GlasshouseFootprint;
  defaultOpen?: boolean;
  onToggle?: () => void;
  /** A new single setpoint: the − and + steps. */
  onTargetChange?: (temperature: number) => void;
  /** A new HVAC mode: the mode buttons in the details. */
  onModeChange?: (mode: HvacMode) => void;
}

const TICKS = 41;

/**
 * The reference's climate dial: a half ring of ticks, lit cyan-to-blue up to the room's temperature, a glowing
 * marker at the setpoint, and the room's temperature big in the middle.
 */
function Gauge({ e, size }: { e: ClimateEntity; size: "card" | "sheet" }) {
  const id = `glasshouse-climate-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const span = Math.max(1, e.maxTemp - e.minTemp);
  const at = (t: number | undefined) => t == null ? undefined : Math.min(1, Math.max(0, (t - e.minTemp) / span));
  const current = at(e.currentTemperature) ?? 0;
  const target = e.state === "off" ? undefined : at(e.targetTemperature);
  const point = (fraction: number, r: number) => {
    const a = Math.PI * (1 - fraction);
    return [100 + r * Math.cos(a), 100 - r * Math.sin(a)] as const;
  };
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const f = i / (TICKS - 1);
    const [x1, y1] = point(f, 78);
    const [x2, y2] = point(f, i % 5 === 0 ? 92 : 89);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="glasshouse-climate-tick" data-lit={e.currentTemperature != null && f <= current + 1e-6 ? "" : undefined} style={e.currentTemperature != null && f <= current + 1e-6 ? { stroke: `url(#${id})` } : undefined} />;
  });
  const marker = target == null ? null : (() => { const [x, y] = point(target, 70); return <circle className="glasshouse-climate-marker" cx={x} cy={y} r="4.5" />; })();
  return (
    <div className="glasshouse-climate-gauge" data-size={size}>
      <svg viewBox="0 0 200 106" aria-hidden="true">
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="8" y1="0" x2="192" y2="0">
            <stop offset="0" className="glasshouse-climate-stop-a" />
            <stop offset="1" className="glasshouse-climate-stop-b" />
          </linearGradient>
        </defs>
        {ticks}
        {marker}
      </svg>
      <div className="glasshouse-climate-reading">
        <p className="glasshouse-climate-now">{e.currentTemperature == null ? "—" : <>{fmtCurrent(e.currentTemperature)}<small>{e.unit}</small></>}</p>
        <p className="glasshouse-climate-label">Current temperature</p>
      </div>
    </div>
  );
}

/**
 * A thermostat: its power switch at the head, the dial on the face with − and + either side for the setpoint, and
 * the modes and today's running hours in its details. Lit while it heats or cools.
 */
export function GlasshouseClimateCard({ entity: e, history, footprint = "standard", defaultOpen = false, onToggle, onTargetChange, onModeChange }: GlasshouseClimateCardProps) {
  const unavailable = e.state === "unavailable";
  const off = e.state === "off";
  const single = e.targetTemperature != null && e.targetLow == null;
  const doing = e.hvacAction && e.hvacAction !== "off" ? ACTION_LABEL[e.hvacAction] : undefined;
  const mode = unavailable ? "Unavailable" : MODE_META[e.state as HvacMode]?.label ?? e.state;
  const stateLabel = off ? "Off" : doing ?? mode;
  const lit = e.hvacAction === "heating" || e.hvacAction === "cooling" || e.hvacAction === "drying" || e.hvacAction === "fan";
  const target = off ? "Off" : e.targetLow != null && e.targetHigh != null ? `${fmtTarget(e.targetLow)}–${fmtTarget(e.targetHigh)}°` : e.targetTemperature != null ? `${fmtTarget(e.targetTemperature)}°` : "—";
  const step = (by: number) => {
    if (e.targetTemperature == null || !onTargetChange) return;
    const next = Math.min(e.maxTemp, Math.max(e.minTemp, Math.round((e.targetTemperature + by) / e.step) * e.step));
    onTargetChange(next);
  };
  const steppers = (where: "card" | "sheet") => single && onTargetChange && !off ? (
    <div className="glasshouse-climate-steps" data-where={where}>
      <GlasshouseStep glyph="minus" label={`Lower ${e.name} to ${fmtTarget(Math.max(e.minTemp, (e.targetTemperature ?? 0) - e.step))}°`} unavailable={unavailable} onPress={() => step(-e.step)} />
      <p className="glasshouse-climate-target"><span>Set to</span><strong>{target}</strong></p>
      <GlasshouseStep glyph="plus" label={`Raise ${e.name} to ${fmtTarget(Math.min(e.maxTemp, (e.targetTemperature ?? 0) + e.step))}°`} unavailable={unavailable} onPress={() => step(e.step)} />
    </div>
  ) : <p className="glasshouse-climate-target" data-where={where}><span>Set to</span><strong>{target}</strong></p>;
  const control = onToggle ? <GlasshouseSwitch label={`${e.name} power`} on={!off && !unavailable} unavailable={unavailable} onPress={onToggle} /> : undefined;
  const face = (
    <div className="glasshouse-climate-face">
      <Gauge e={e} size="card" />
      {steppers("card")}
    </div>
  );
  return (
    <GlasshouseCardFrame card="climate" name={e.name} entityId={e.entityId} area={e.area} state={e.state} stateLabel={stateLabel} summary={e.currentTemperature == null ? target : `${fmtCurrent(e.currentTemperature)}${e.unit}`} icon={<IconClimate />} footprint={footprint} lit={lit} control={control} face={face} defaultOpen={defaultOpen}>
      {!unavailable && <Gauge e={e} size="sheet" />}
      {!unavailable && steppers("sheet")}
      {onModeChange && e.hvacModes.length > 1 && !unavailable && (
        <div className="glasshouse-ask-b" role="group" aria-label="Mode">
          {e.hvacModes.map((m) => <GlasshouseAction key={m} label={MODE_META[m]?.label ?? m} pressed={e.state === m} onPress={() => onModeChange(m)} />)}
        </div>
      )}
      {history && <div className="glasshouse-sheet-chart"><GlasshouseBars samples={history.samples} current={history.currentHour} label={`${history.activity} ${fmtDuration(history.activeMinutes)} today`} /></div>}
      <GlasshouseFacts facts={[
        ["Mode", mode],
        doing && ["Now", doing],
        ["Target", target],
        e.currentHumidity != null && ["Humidity", `${e.currentHumidity}%`],
        history && ["Running today", fmtDuration(history.activeMinutes)],
        e.presetMode && ["Preset", e.presetMode],
        e.lastChanged && ["Last changed", e.lastChanged],
        unavailable && e.lastSeen && ["Last seen", e.lastSeen],
      ]} />
    </GlasshouseCardFrame>
  );
}

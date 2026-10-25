import { useId, useState } from "react";
import type { ClimateEntity, HvacMode } from "../domains/climate/types";
import { ACTION_LABEL, MODE_META, fmtCurrent, fmtTarget, orderedRange, titleCase } from "../domains/climate/modes";
import { GlassCard, PowerButton } from "./ui";
import type { GlassSize } from "./ui";
import "./cards.css";
import { GlassDial, GlassPick } from "./controls";
import { IconAirConditioner, IconFan, IconMode, IconPreset } from "./icons";

export interface GlassClimateCardProps {
  entity: ClimateEntity;
  onToggle: () => void;
  onTargetChange: (temperature: number) => void;
  onRangeChange?: (low: number, high: number) => void;
  onModeChange?: (mode: HvacMode) => void;
  onPresetChange?: (preset: string) => void;
  onFanChange?: (fan: string) => void;
  size?: GlassSize;
}

/**
 * One climate entity: the setpoint on a dial, what the unit is doing and the room's temperature in its middle,
 * and the mode, fan and preset as native pickers. A heat/cool range edits one end at a time, picked in the
 * middle of the dial. Off keeps the room's temperature and drops the setpoint.
 */
export function GlassClimateCard({ entity: e, onToggle, onTargetChange, onRangeChange, onModeChange, onPresetChange, onFanChange, size = "l" }: GlassClimateCardProps) {
  const uid = useId();
  const [end, setEnd] = useState<"low" | "high">("low");
  const unav = e.state === "unavailable";
  const off = e.state === "off";
  const range = e.state === "heat_cool" && e.targetLow != null && e.targetHigh != null && onRangeChange != null;
  const setpoint = range ? (end === "low" ? e.targetLow : e.targetHigh) : e.targetTemperature;
  const now = e.currentTemperature != null ? `${fmtCurrent(e.currentTemperature)}°` : null;
  const doing = e.hvacAction ? ACTION_LABEL[e.hvacAction] : unav ? null : MODE_META[e.state as HvacMode].label.replace("​", "");
  const endValue = (k: "low" | "high") => (k === "low" ? e.targetLow : e.targetHigh) ?? 0;

  const setRange = (v: number) => {
    const [lo, hi] = orderedRange(end === "low" ? v : endValue("low"), end === "high" ? v : endValue("high"));
    onRangeChange?.(lo, hi);
  };

  const picks = [
    onModeChange && e.hvacModes.length > 1 && (
      <GlassPick key="mode" label="Mode" icon={<IconMode />} value={unav ? undefined : e.state as HvacMode} options={e.hvacModes.map((m) => ({ value: m, label: MODE_META[m].label.replace("​", "") }))} onChange={onModeChange} />
    ),
    onFanChange && e.fanModes && e.fanModes.length > 0 && (
      <GlassPick key="fan" label="Fan" icon={<IconFan />} value={e.fanMode} options={e.fanModes.map((f) => ({ value: f, label: titleCase(f) }))} onChange={onFanChange} />
    ),
    onPresetChange && e.presetModes && e.presetModes.length > 0 && (
      <GlassPick key="preset" label="Preset" icon={<IconPreset />} value={e.presetMode} options={e.presetModes.map((p) => ({ value: p, label: titleCase(p) }))} onChange={onPresetChange} />
    ),
  ].filter(Boolean);

  return (
    <GlassCard
      size={size}
      name={e.name}
      subtitle={e.area}
      icon={<IconAirConditioner />}
      state={unav ? "unavailable" : off ? "off" : "on"}
      action={<PowerButton label={e.name} on={!off && !unav} unavailable={unav} onToggle={onToggle} />}
    >
      {unav ? (
        <p className="gl-quiet">Unavailable{e.lastSeen ? ` · last seen ${e.lastSeen}` : ""}</p>
      ) : (
        <div className="gl-climate">
          <GlassDial
            id={`${uid}-set`}
            label={range ? `${e.name} ${end === "low" ? "heat to" : "cool to"}` : `${e.name} setpoint`}
            value={setpoint ?? e.currentTemperature ?? e.minTemp}
            min={e.minTemp}
            max={e.maxTemp}
            step={e.step}
            valueText={(v) => `${fmtTarget(v)} ${e.unit === "°F" ? "degrees Fahrenheit" : "degrees Celsius"}`}
            disabled={off || setpoint == null}
            marker={range ? endValue(end === "low" ? "high" : "low") : undefined}
            onChange={range ? setRange : onTargetChange}
          >
            {range ? (
              <div className="gl-climate-ends" role="group" aria-label="Edit">
                {(["low", "high"] as const).map((k) => (
                  <button key={k} type="button" className="gl-btn gl-climate-end" aria-pressed={end === k} aria-label={`${k === "low" ? "Heat to" : "Cool to"} ${fmtTarget(endValue(k))}°`} onClick={() => setEnd(k)}>
                    {fmtTarget(endValue(k))}°
                  </button>
                ))}
              </div>
            ) : (
              <p className="gl-climate-set">{off || setpoint == null ? now ?? "—" : <>{fmtTarget(setpoint)}<span>°</span></>}</p>
            )}
            <p className="gl-climate-doing">{[off ? "Off" : doing, !off && setpoint != null && now ? `now ${now}` : null].filter(Boolean).join(" · ")}</p>
          </GlassDial>
          {picks.length > 0 && <div className="gl-climate-picks">{picks}</div>}
        </div>
      )}
    </GlassCard>
  );
}

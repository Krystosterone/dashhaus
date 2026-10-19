import { useId } from "react";
import type { ClimateEntity, ClimateHistory, HvacMode } from "./types";
import { MODE_META, ACTION_LABEL, ModeIcon, fmtTarget, fmtCurrent, titleCase, orderedRange } from "./modes";
import { Orb, CircleButton, IconOpen, IconClose, TogglePill, UnavailableSlot, TodayStrip, ChoiceChips, Sheet, fmtDuration, paint } from "../../shared/ui";
import type { ColorProp } from "../../shared/ui";
import { RangeBar, RangeFine } from "./RangeBar";
import "./ClimateWidget.css";

export interface ClimateWidgetProps {
  entity: ClimateEntity;
  /** Shown at L size and in the sheet. Omit to hide the Today strip. */
  history?: ClimateHistory;
  variant?: "card" | "sheet";
  /** Card only. "thin" puts everything in one 56px row. */
  density?: "regular" | "thin";
  /**
   * Thin only. false: no control in the row (no pill, bar, stepper or switch); the value shows as text in
   * its place and tapping the row opens the details sheet, where every control is. The orb still switches
   * and holds as usual. Default true.
   */
  showControl?: boolean;
  /** Orb and Off pill: turn off, or back on to the last mode. */
  onToggle: () => void;
  onTargetChange: (t: number) => void;
  onRangeChange?: (low: number, high: number) => void;
  onModeChange?: (m: HvacMode) => void;
  onPresetChange?: (p: string) => void;
  onFanChange?: (f: string) => void;
  onOpenDetails?: () => void;
  onClose?: () => void;
  /** The orb's colour. Default: apricot when heating, blue when cooling. "none" keeps it the accent. */
  color?: ColorProp;
}

const IconMinus = () => <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8" /></svg>;
const IconPlus = () => <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8M7 3v8" /></svg>;

function Stepper({ label, kicker, value, min, max, step, onChange }: { label: string; kicker?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const down = Math.max(min, +(value - step).toFixed(2));
  const up = Math.min(max, +(value + step).toFixed(2));
  return (
    <div className="cw-step" role="group" aria-label={label}>
      <button type="button" className="cw-step-b" aria-label={`Lower to ${fmtTarget(down)}°`} disabled={value <= min} onClick={() => onChange(down)}><span><IconMinus /></span></button>
      <span className="cw-step-v" aria-live="polite">
        {kicker && <span className="cw-step-k">{kicker}</span>}
        {fmtTarget(value)}<small>°</small>
      </span>
      <button type="button" className="cw-step-b" aria-label={`Raise to ${fmtTarget(up)}°`} disabled={value >= max} onClick={() => onChange(up)}><span><IconPlus /></span></button>
    </div>
  );
}

/**
 * One climate entity. Same sizes and fixed heights as the light widget, so they share a grid.
 * The orb switches it off and back on; the slot sets the target; the sheet holds modes, presets and fan.
 */
export function ClimateWidget({ entity: e, history, variant = "card", density = "regular", showControl = true, onToggle, onTargetChange, onRangeChange, onModeChange, onPresetChange, onFanChange, onOpenDetails, onClose, color }: ClimateWidgetProps) {
  const uid = useId();
  const sheet = variant === "sheet";
  const thin = !sheet && density === "thin";
  const bare = thin && !showControl;
  const unav = e.state === "unavailable";
  const mode: HvacMode = unav ? "off" : (e.state as HvacMode);
  const on = !unav && mode !== "off";
  const action = e.hvacAction ?? (on ? "idle" : "off");
  const active = on && action !== "idle" && action !== "off";
  // Running is energy: the control fills with the accent and the card glows. On but idle stays neutral.
  // Which way it works (heat or cool) is the orb's colour.
  const direction = on && (mode === "heat" || mode === "cool") ? MODE_META[mode] : null;
  const colors = paint(active ? "energy" : "state", active ? 0.9 : 0, direction, color);

  const cur = e.currentTemperature;
  const range = mode === "heat_cool" && e.targetLow != null && e.targetHigh != null;
  const single = !range && e.targetTemperature != null && (mode === "heat" || mode === "cool" || mode === "auto");
  const statusParts = [cur != null ? `${fmtCurrent(cur)}°${thin ? "" : " now"}` : null, unav ? "Not responding" : ACTION_LABEL[action]].filter(Boolean);
  const status = statusParts.join(" · ");
  const setText = unav ? "Unavailable" : !on ? "Off" : range ? (e.targetLow === e.targetHigh ? `Hold ${fmtTarget(e.targetLow!)}°` : `${fmtTarget(e.targetLow!)}–${fmtTarget(e.targetHigh!)}°`) : single ? `Set ${fmtTarget(e.targetTemperature!)}°` : MODE_META[mode].label;
  const kicker = mode === "heat" ? "Heat to" : mode === "cool" ? "Cool to" : "Keep at";
  // HA heat_cool requires target_temp_low <= target_temp_high.
  const setRange = (lo: number, hi: number) => {
    const [l, h] = orderedRange(lo, hi);
    onRangeChange?.(l, h);
  };

  let slot;
  if (unav) slot = <UnavailableSlot lastSeen={e.lastSeen} />;
  else if (!on) slot = <TogglePill label={`${e.name}: Off, turn on`} on={false} onToggle={onToggle} extra="Turn on">Off</TogglePill>;
  else if (range) {
    slot = <RangeBar id={`${uid}-r`} name={e.name} low={e.targetLow!} high={e.targetHigh!} current={cur} min={e.minTemp} max={e.maxTemp} step={e.step} onChange={setRange} onOpen={sheet ? undefined : onOpenDetails} />;
  } else if (single) {
    slot = <Stepper label={`${e.name} target temperature`} kicker={kicker} value={e.targetTemperature!} min={e.minTemp} max={e.maxTemp} step={e.step} onChange={onTargetChange} />;
  } else {
    slot = <TogglePill label={`${e.name}: ${MODE_META[mode].label}${e.fanMode ? `, Fan ${titleCase(e.fanMode).toLowerCase()}` : ""}`} on onToggle={onToggle} extra={e.fanMode ? `Fan ${titleCase(e.fanMode).toLowerCase()}` : undefined}>{MODE_META[mode].label}</TogglePill>;
  }

  const summary = !history ? "" : unav ? `Unreachable since ${e.lastSeen ?? "earlier"}` : history.activeMinutes > 0 ? `${titleCase(history.activity)} ${fmtDuration(history.activeMinutes)}` : `Not ${history.activity} today`;

  // The value in words: under the name in narrow thin rows, and in place of the control when it's hidden.
  const subText = cur != null && !unav ? `${fmtCurrent(cur)}° · ${setText}` : setText;
  // In place of the control the status line already gives the room temperature: just the setpoint.
  const valText = setText;
  return (
    <article className={`hd cw${sheet ? " hd--sheet" : ""}${thin ? " hd--thin" : ""}`} data-control={bare ? "off" : undefined} data-state={unav ? "unavailable" : on ? (active ? "active" : "idle") : "off"} data-action={action} {...colors} aria-labelledby={`${uid}-n`}>
      <header className="hd-head">
        <Orb label={`${e.name}, ${on ? MODE_META[mode].label : "off"}`} pressed={on} unavailable={unav} intensity={active ? 1 : 0.4} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          <ModeIcon mode={on ? mode : (e.hvacModes.find((m) => m !== "off") ?? "heat")} unavailable={unav} />
        </Orb>
        <div className="hd-title">
          <h2 className="hd-name" id={`${uid}-n`} title={e.name}>{e.name}</h2>
          <p className="hd-area">{sheet && e.area ? `${e.area} · ${status}` : status}</p>
          {thin && <p className="hd-sub" aria-hidden="true">{subText}</p>}
        </div>
        <p className="hd-num" aria-hidden="true">{unav || cur == null ? null : <>{fmtCurrent(cur)}<span>°</span></>}</p>
        {sheet
          ? <CircleButton
            label={`Close ${e.name}`}
            onClick={onClose}
            // Focus lands on the sheet's close button when it opens: dialog focus management, not page-load focus theft.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          ><IconClose /></CircleButton>
          : onOpenDetails && <CircleButton label={`${e.name} details`} onClick={onOpenDetails}><IconOpen /></CircleButton>}
      </header>

      <div className="hd-slot">{bare ? <p className="hd-val">{valText}</p> : slot}</div>

      {sheet && !unav && (
        <div className="hd-extra">
          {range && onRangeChange && <RangeFine low={e.targetLow!} high={e.targetHigh!} min={e.minTemp} max={e.maxTemp} step={e.step} onChange={setRange} />}
          {onModeChange && e.hvacModes.length > 1 && (
            <ChoiceChips id={`${uid}-m`} label="Mode" options={e.hvacModes.map((m) => ({ value: m, label: MODE_META[m].label }))} value={mode} onChange={onModeChange} />
          )}
          {onPresetChange && e.presetModes && e.presetModes.length > 0 && (
            <ChoiceChips id={`${uid}-p`} label="Preset" options={e.presetModes.map((p) => ({ value: p, label: titleCase(p) }))} value={e.presetMode} onChange={onPresetChange} />
          )}
          {onFanChange && e.fanModes && e.fanModes.length > 0 && (
            <ChoiceChips id={`${uid}-f`} label="Fan" options={e.fanModes.map((f) => ({ value: f, label: titleCase(f) }))} value={e.fanMode} onChange={onFanChange} />
          )}
        </div>
      )}

      {history && <TodayStrip samples={history.samples} currentHour={history.currentHour} summary={summary} />}

      {sheet && (
        <p className="hd-info">
          <span>{e.currentHumidity != null ? `Humidity ${Math.round(e.currentHumidity)}%` : unav ? `Last seen ${e.lastSeen ?? "unknown"}` : ""}</span>
          <span>{unav ? "" : e.lastChanged ? `Last changed ${e.lastChanged}` : ""}</span>
        </p>
      )}
    </article>
  );
}

export interface ClimateSheetProps extends Omit<ClimateWidgetProps, "variant" | "density" | "onOpenDetails" | "onClose"> {
  open: boolean;
  onClose: () => void;
}

export function ClimateSheet({ open, onClose, ...props }: ClimateSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} label={`${props.entity.name} details`}>
      <ClimateWidget {...props} variant="sheet" onClose={onClose} />
    </Sheet>
  );
}

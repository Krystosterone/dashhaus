import { useLayoutEffect, useRef } from "react";
import type { ClimateEntity, ClimateHistory, HvacMode } from "../../domains/climate/types";
import { MODE_META, ACTION_LABEL, ModeIcon, ThermostatIcon, fmtTarget, fmtCurrent, titleCase, orderedRange } from "./modes";
import { Orb, CardTitle, TogglePill, UnavailableSlot, Stepper, TodayStrip, ChoiceChips, fmtDuration, paint, SheetClose, useCard, detailsSheet } from "../../shared/ui";
import type { ColorProp, CardProps, SheetProps } from "../../shared/ui";
import { RangeBar, RangeFine } from "./RangeBar";
import "./ClimateWidget.css";

export interface ClimateWidgetProps extends CardProps {
  entity: ClimateEntity;
  /** Shown in the featured footprint and in the sheet. Omit to hide the Today strip. */
  history?: ClimateHistory;
  /**
   * Compact only. false removes the inline control, shows the value in its place, and makes the row open
   * the detail sheet. The orb keeps its tap and hold actions. Default true.
   */
  showControl?: boolean;
  /** Orb and Turn on pill: turn off, or back on to the last mode. */
  onToggle: () => void;
  onTargetChange: (t: number) => void;
  onRangeChange?: (low: number, high: number) => void;
  onModeChange?: (m: HvacMode) => void;
  onPresetChange?: (p: string) => void;
  onFanChange?: (f: string) => void;
  onOpenDetails?: () => void;
  onClose?: () => void;
  /** Opt-in colour for the orb (standard, featured and sheet only). Default: the accent. */
  color?: ColorProp;
}

function useSlotTransition(kind: string) {
  const slotRef = useRef<HTMLDivElement>(null);
  const previousKind = useRef(kind);

  useLayoutEffect(() => {
    if (previousKind.current === kind) return;
    previousKind.current = kind;

    const slot = slotRef.current;
    if (!slot?.animate) return;

    const styles = getComputedStyle(slot);
    const press = styles.getPropertyValue("--press").trim();
    const duration = Number.parseFloat(press) * (press.endsWith("ms") ? 1 : 1000);
    const easing = styles.getPropertyValue("--ease-out").trim();
    if (!duration || !easing) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animation = slot.animate(
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: "scale(0.97)" }, { opacity: 1, transform: "scale(1)" }],
      { duration, easing },
    );
    return () => animation.cancel();
  }, [kind]);

  return slotRef;
}

/**
 * One climate entity. It shares the modular footprint matrix with every dashboard widget.
 * The orb switches it off and back on; the slot sets the target; the sheet holds modes, presets and fan.
 */
export function ClimateWidget({ entity: e, history, variant, footprint, showControl, onToggle, onTargetChange, onRangeChange, onModeChange, onPresetChange, onFanChange, onOpenDetails, onClose, color }: ClimateWidgetProps) {
  const { uid, nameId, sheet, compact, bare, article, area } = useCard("cw", { variant, footprint, showControl, area: e.area });
  const unav = e.state === "unavailable";
  const mode: HvacMode = unav ? "off" : (e.state as HvacMode);
  const on = !unav && mode !== "off";
  const action = e.hvacAction ?? (on ? "idle" : "off");
  const active = on && action !== "idle" && action !== "off";
  // On is the accent orb. Running is energy: the orb blooms and the card glows. Which way it works
  // (heat or cool) is the mode icon and the action words, not a colour.
  const colors = paint(active ? "energy" : "state", active ? 0.9 : 0, null, color);

  const cur = e.currentTemperature;
  const range = mode === "heat_cool" && e.targetLow != null && e.targetHigh != null;
  const single = !range && e.targetTemperature != null && (mode === "heat" || mode === "cool" || mode === "auto");
  const statusParts = [cur != null ? `${fmtCurrent(cur)}°${compact ? "" : " now"}` : null, unav ? "Unavailable" : ACTION_LABEL[action]].filter(Boolean);
  const status = statusParts.join(" · ");
  const modePrefix = compact && on ? `${MODE_META[mode].label} · ` : "";
  const setText = unav ? "Unavailable" : !on ? "Off" : range ? `${modePrefix}${e.targetLow === e.targetHigh ? `Hold ${fmtTarget(e.targetLow!)}°` : `${fmtTarget(e.targetLow!)}–${fmtTarget(e.targetHigh!)}°`}` : single ? `${modePrefix}Set ${fmtTarget(e.targetTemperature!)}°` : MODE_META[mode].label;
  const kicker = mode === "heat" ? "Heat to" : mode === "cool" ? "Cool to" : "Keep at";
  // HA heat_cool requires target_temp_low <= target_temp_high.
  const setRange = (lo: number, hi: number) => {
    const [l, h] = orderedRange(lo, hi);
    onRangeChange?.(l, h);
  };

  let slot;
  if (unav) slot = <UnavailableSlot lastSeen={e.lastSeen} />;
  else if (!on) slot = <TogglePill label={`${e.name}: Off, turn on`} on={false} onToggle={onToggle} turnOn>Turn on</TogglePill>;
  else if (range) {
    slot = <RangeBar id={`${uid}-r`} name={e.name} low={e.targetLow!} high={e.targetHigh!} current={cur} modeCue={compact ? <ModeIcon mode="heat_cool" /> : undefined} min={e.minTemp} max={e.maxTemp} step={e.step} onChange={setRange} onOpen={sheet ? undefined : onOpenDetails} />;
  } else if (single) {
    slot = <Stepper label={`${e.name} target temperature`} kicker={compact ? undefined : kicker} cue={compact ? <ModeIcon mode={mode} /> : undefined} value={e.targetTemperature!} unit="°" format={fmtTarget} min={e.minTemp} max={e.maxTemp} step={e.step} onChange={onTargetChange} />;
  } else {
    slot = <TogglePill label={`${e.name}: ${MODE_META[mode].label}${e.fanMode ? `, Fan ${titleCase(e.fanMode).toLowerCase()}` : ""}`} on onToggle={onToggle} extra={e.fanMode ? `Fan ${titleCase(e.fanMode).toLowerCase()}` : undefined}>{MODE_META[mode].label}</TogglePill>;
  }

  const slotKind = bare ? "bare" : unav ? "unavailable" : !on ? "off" : range ? "range" : single ? "setpoint" : "mode";
  const slotRef = useSlotTransition(slotKind);

  const summary = !history ? "" : unav ? `Unavailable since ${e.lastSeen ?? "earlier"}` : history.activeMinutes > 0 ? `${titleCase(history.activity)} ${fmtDuration(history.activeMinutes)}` : `Not ${history.activity} today`;

  // The compact value appears under the name, or in place of a hidden control.
  // The status line already gives the room temperature: the replacement value is just the setpoint.
  const valText = setText;
  return (
    <article {...article} data-state={unav ? "unavailable" : on ? (active ? "active" : "idle") : "off"} data-action={action} {...colors}>
      <header className="hd-head">
        <Orb label={`${e.name}, ${on ? MODE_META[mode].label : "off"}`} pressed={on} unavailable={unav} intensity={active ? 1 : 0.4} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          {compact
            ? <ThermostatIcon />
            : <ModeIcon mode={on ? mode : (e.hvacModes.find((m) => m !== "off") ?? "heat")} unavailable={unav} />}
        </Orb>
        <CardTitle id={nameId} name={e.name} onOpen={sheet ? undefined : onOpenDetails}>
          <p className="hd-area">{sheet && area ? `${area} · ${status}` : status}</p>
          {compact && (
            <p className="hd-sub">
              {cur != null && !unav && <span className="hd-sub-optional">{fmtCurrent(cur)}° · </span>}
              {setText}
            </p>
          )}
        </CardTitle>
        <p className="hd-num" aria-hidden="true">{unav || cur == null ? null : <>{fmtCurrent(cur)}<span>°</span></>}</p>
        {sheet && <SheetClose label={`Close ${e.name}`} onClick={onClose} />}
      </header>

      <div className="hd-slot"><div ref={slotRef} className="cw-slot">{bare ? <p className="hd-val">{valText}</p> : slot}</div></div>

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

export type ClimateSheetProps = SheetProps<ClimateWidgetProps>;

export const ClimateSheet = detailsSheet(ClimateWidget);

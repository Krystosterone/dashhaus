import type { ClimateEntity, ClimateHistory, HvacMode } from "@dashhaus/core/entities/climate/types";
import { ACTION_LABEL, fmtTarget, fmtCurrent, titleCase, orderedRange } from "@dashhaus/core/entities/climate/modes";
import { TARGET_WORD, climateFacts, roomTemperatureBlank } from "@dashhaus/core/entities/climate/words";
import { canSwitch, onMode } from "@dashhaus/core/entities/climate/power";
import { NOT_REPORTED } from "@dashhaus/core/entities/facts";
import { lastChangedFact, lastSeenFact, nowText } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { ModeIcon, ThermostatIcon, modeLabel } from "./modes";
import { CardFrame, ChoiceChips, SheetBlock, Stepper, Today, TogglePill, detailsSheet, paint, useCard } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import { RangeBar, RangeFine } from "./RangeBar";
import "./ClimateCard.css";

export interface ClimateCardProps extends CardProps {
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
}

/**
 * One climate entity. It shares the modular footprint matrix with every dashboard card.
 * The orb switches it off and back on; the slot sets the target; the sheet holds modes, presets and fan.
 */
export function ClimateCard({ entity: e, history, variant, footprint, showControl, onToggle, onTargetChange, onRangeChange, onModeChange, onPresetChange, onFanChange, onOpenDetails, onClose }: ClimateCardProps) {
  const card = useCard("cw", { variant, footprint, showControl, area: e.area });
  const { uid, sheet, compact, bare, area } = card;
  const unav = e.state === "unavailable";
  const mode: HvacMode = unav ? "off" : (e.state as HvacMode);
  const on = !unav && mode !== "off";
  const action = e.hvacAction ?? (on ? "idle" : "off");
  const active = on && action !== "idle" && action !== "off";
  // A unit that can't be switched from where it is (a heat-only thermostat has no off) draws its mode icon bare, and
  // its mode in words, where a press would send what Home Assistant refuses.
  const switchable = canSwitch(e);
  // On is the accent orb. Running is energy: the orb blooms and the card glows. Which way it works
  // (heat or cool) is the mode icon and the action words, not a colour.
  const colors = paint(active ? "energy" : "state", active ? 0.9 : 0);

  const cur = e.currentTemperature;
  const range = mode === "heat_cool" && e.targetLow != null && e.targetHigh != null;
  const single = !range && e.targetTemperature != null && (mode === "heat" || mode === "cool" || mode === "auto");
  // While unavailable a control keeps its room on the status line (spec/orb.md → One state vocabulary); the slot says
  // Unavailable. Otherwise the room's temperature, as it is now, and what the unit is doing: before its first reading
  // "No reading yet" in its place, and nothing where the thermostat never reports one (spec/cards.md).
  const missing = cur == null ? roomTemperatureBlank(e) : undefined;
  const room = cur != null ? (compact ? `${fmtCurrent(cur)}°` : nowText(`${fmtCurrent(cur)}°`)) : missing === NOT_REPORTED ? null : missing;
  const status = unav ? area ?? "Unavailable" : [room, ACTION_LABEL[action]].filter(Boolean).join(" · ");
  // The compact cue: the mode and its setpoint, in figures, so no word is said twice.
  const modePrefix = compact && on ? `${modeLabel(mode)} · ` : "";
  const setText = unav ? "Unavailable" : !on ? "Off" : range ? `${modePrefix}${e.targetLow === e.targetHigh ? `${fmtTarget(e.targetLow!)}°` : `${fmtTarget(e.targetLow!)}–${fmtTarget(e.targetHigh!)}°`}` : single ? `${modePrefix}${fmtTarget(e.targetTemperature!)}°` : modeLabel(mode);
  const kicker = TARGET_WORD[mode] ?? TARGET_WORD.auto;
  // HA heat_cool requires target_temp_low <= target_temp_high.
  const setRange = (lo: number, hi: number) => {
    const [l, h] = orderedRange(lo, hi);
    onRangeChange?.(l, h);
  };

  let slot;
  if (!on) slot = <TogglePill label={`${e.name}: Off, turn on`} on={false} onToggle={onToggle} turnOn>Turn on</TogglePill>;
  else if (range) {
    slot = <RangeBar id={`${uid}-r`} name={e.name} low={e.targetLow!} high={e.targetHigh!} current={cur} modeCue={compact ? <ModeIcon mode="heat_cool" /> : undefined} min={e.minTemp} max={e.maxTemp} step={e.step} onChange={setRange} onOpen={sheet ? undefined : onOpenDetails} />;
  } else if (single) {
    slot = <Stepper label={`${e.name} target temperature`} kicker={compact ? undefined : kicker} cue={compact ? <ModeIcon mode={mode} /> : undefined} value={e.targetTemperature!} unit="°" format={fmtTarget} min={e.minTemp} max={e.maxTemp} step={e.step} onChange={onTargetChange} />;
  } else if (!switchable) {
    slot = <p className="hd-st">{modeLabel(mode)}</p>;
  } else {
    slot = <TogglePill label={`${e.name}: ${modeLabel(mode)}${e.fanMode ? `, Fan ${titleCase(e.fanMode).toLowerCase()}` : ""}`} on onToggle={onToggle} extra={e.fanMode ? `Fan ${titleCase(e.fanMode).toLowerCase()}` : undefined}>{modeLabel(mode)}</TogglePill>;
  }

  const icon = compact ? <ThermostatIcon /> : <ModeIcon mode={on ? mode : (onMode(e) ?? "heat")} unavailable={unav} />;

  // What the slot shows: a mode's control swapping for another's fades in (CardFrame's slotKind).
  const slotKind = bare ? "bare" : unav ? "unavailable" : !on ? "off" : range ? "range" : single ? "setpoint" : "mode";

  // The compact value appears under the name, or in place of a hidden control.
  // The status line already gives the room temperature: the replacement value is just the setpoint.
  const valText = setText;
  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": unav ? "unavailable" : on ? (active ? "active" : "idle") : "off", "data-action": action, ...colors }}
      orb={switchable || unav ? {
        label: `${e.name}, ${on ? modeLabel(mode) : "off"}`, pressed: on, intensity: active ? 1 : 0.4, onToggle,
        children: icon,
      } : undefined}
      glyph={switchable || unav ? undefined : icon}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={sheet && area && !unav ? `${area} · ${status}` : status}
      value={<>{cur != null && !unav && <span className="hd-sub-optional">{fmtCurrent(cur)}° · </span>}{setText}</>}
      bareValue={valText}
      readout={{ value: unav || cur == null ? null : <>{fmtCurrent(cur)}<span>°</span></> }}
      onClose={onClose}
      control={slot}
      slotKind={slotKind}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: unav ? "" : climateFacts(e) }}
    >
      {!unav && (
        <SheetBlock>
          {range && onRangeChange && <RangeFine low={e.targetLow!} high={e.targetHigh!} min={e.minTemp} max={e.maxTemp} step={e.step} onChange={setRange} />}
          {onModeChange && e.hvacModes.length > 1 && (
            <ChoiceChips id={`${uid}-m`} label="Mode" options={e.hvacModes.map((m) => ({ value: m, label: modeLabel(m) }))} value={mode} onChange={onModeChange} />
          )}
          {onPresetChange && e.presetModes && e.presetModes.length > 0 && (
            <ChoiceChips id={`${uid}-p`} label="Preset" options={e.presetModes.map((p) => ({ value: p, label: titleCase(p) }))} value={e.presetMode} onChange={onPresetChange} />
          )}
          {onFanChange && e.fanModes && e.fanModes.length > 0 && (
            <ChoiceChips id={`${uid}-f`} label="Fan" options={e.fanModes.map((f) => ({ value: f, label: titleCase(f) }))} value={e.fanMode} onChange={onFanChange} />
          )}
        </SheetBlock>
      )}
      {history && <Today samples={history.samples} currentHour={history.currentHour} summary={todaySummary(history.activity, history.activeMinutes)} />}
    </CardFrame>
  );
}

export type ClimateSheetProps = SheetProps<ClimateCardProps>;

export const ClimateSheet = detailsSheet(ClimateCard);

import type { ClimateEntity, ClimateHistory, HvacMode } from "@dashhaus/core/entities/climate/types";
import { ACTION_LABEL, MODE_META, fmtCurrent, fmtTarget } from "@dashhaus/core/entities/climate/modes";
import { todaySummary } from "@dashhaus/core/entities/today";
import { lastChangedFact, lastSeenFact, unavailableSince } from "@dashhaus/core/entities/facts";
import { TitanAction, TitanCardFrame, TitanDatum, TitanFader, TitanGauge, TitanKeyGroup } from "../../shared/ui";
import type { TitanFootprint, TitanTone } from "../../shared/ui";
import "./TitanClimateCard.css";

export interface TitanClimateCardProps {
  entity: ClimateEntity;
  history?: ClimateHistory;
  footprint?: TitanFootprint;
  defaultOpen?: boolean;
  onToggle?: () => void;
  /** Sets the one setpoint (heat, cool, auto). */
  onTargetChange?: (temperature: number) => void;
  /** Picks an HVAC mode the unit lists. */
  onModeChange?: (mode: HvacMode) => void;
}

/** Heating is salmon, cooling teal, idle or off slate; the words always say which, so colour never carries it alone. */
const toneOf = (e: ClimateEntity): TitanTone =>
  e.state === "off" ? "idle" : e.hvacAction === "heating" ? "on" : e.hvacAction === "cooling" ? "read" : "idle";

/**
 * A thermostat: the room's temperature as the big figure, what the unit is doing and towards what in words, the
 * setpoint on the ruled fader, POWER and the current mode as keys, and every mode in the details.
 */
export function TitanClimateCard({ entity: e, history, footprint = "standard", defaultOpen = false, onToggle, onTargetChange, onModeChange }: TitanClimateCardProps) {
  const unavailable = e.state === "unavailable";
  const off = e.state === "off";
  const range = e.state === "heat_cool" && e.targetLow != null && e.targetHigh != null;
  const target = range ? `${fmtTarget(e.targetLow!)}–${fmtTarget(e.targetHigh!)}°` : e.targetTemperature != null ? `${fmtTarget(e.targetTemperature)}°` : undefined;
  const doing = off ? "Off" : e.hvacAction ? ACTION_LABEL[e.hvacAction] : MODE_META[e.state as HvacMode]?.label ?? e.state;
  const status = off ? "Off" : target ? `${doing} · set ${target}` : doing;
  const word = history?.activity ?? "running";
  const today = history && { samples: history.samples, currentHour: history.currentHour, summary: unavailable ? unavailableSince(e.lastSeen) : todaySummary(word, history.activeMinutes) };
  const span = e.maxTemp - e.minTemp || 1;
  const setpoint = e.targetTemperature;
  const gauge = !range && setpoint != null && onTargetChange && !unavailable
    ? <TitanFader label="SET" name="Target temperature" value={setpoint} min={e.minTemp} max={e.maxTemp} step={e.step} format={(v) => `${fmtTarget(v)}°`} valueText={(v) => `${off ? "Off. " : ""}Set to ${fmtTarget(v)} degrees`} onChange={onTargetChange} tone={toneOf(e) === "idle" ? "on" : toneOf(e)} resting={off} />
    : <TitanGauge label="SET" name="Target temperature" fraction={setpoint != null ? (setpoint - e.minTemp) / span : 0} text={target ?? "—"} tone="idle" empty={unavailable || target == null} />;
  const actions = (
    <>
      {e.currentHumidity != null && <TitanDatum label="Humidity" value={unavailable ? "—" : `${Math.round(e.currentHumidity)}%`} />}
      {onToggle && <TitanAction label="Power" pressed={!off && !unavailable} unavailable={unavailable} onPress={onToggle} />}
    </>
  );
  const modes = onModeChange && e.hvacModes.length > 1 && !unavailable
    ? <TitanKeyGroup label="Mode" value={e.state as HvacMode} options={e.hvacModes.map((m) => ({ value: m, label: MODE_META[m]?.label ?? m }))} onChange={onModeChange} />
    : undefined;
  return (
    <TitanCardFrame
      card="climate" code="CL" entityId={e.entityId} name={e.name} area={e.area} state={e.state}
      status={status} summary={e.currentTemperature == null ? "—" : fmtCurrent(e.currentTemperature)} unit={e.currentTemperature == null ? undefined : e.unit}
      tone={toneOf(e)} today={today || undefined} gauge={gauge} actions={actions} footprint={footprint} defaultOpen={defaultOpen}
      facts={[
        ["Mode", unavailable ? "—" : MODE_META[e.state as HvacMode]?.label ?? e.state],
        !unavailable && e.hvacAction && ["Doing", ACTION_LABEL[e.hvacAction]],
        target && ["Target", target],
        ["Range", `${fmtTarget(e.minTemp)}–${fmtTarget(e.maxTemp)}° in steps of ${e.step}`],
        e.presetMode && ["Preset", e.presetMode.replace(/_/g, " ")],
        e.fanMode && ["Fan", e.fanMode.replace(/_/g, " ")],
        !unavailable && ["Changed", lastChangedFact(e.lastChanged).replace(/^Last changed /, "")],
        unavailable && ["Last seen", lastSeenFact(e.lastSeen).replace(/^Last seen /, "")],
      ]}
    >
      {modes}
    </TitanCardFrame>
  );
}

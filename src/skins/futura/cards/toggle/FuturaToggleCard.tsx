import type { ToggleEntity, ToggleHistory } from "@dashhaus/core/entities/toggle/types";
import { fmtDuration } from "@dashhaus/core/entities/format";
import { FuturaCardFrame, FuturaDialKey, FuturaReadout, FuturaStats } from "../../shared/ui";
import type { FuturaFootprint, FuturaStat } from "../../shared/ui";
import { IconToggle } from "./icons";
import "./FuturaToggleCard.css";

export interface FuturaToggleCardProps {
  entity: ToggleEntity;
  history?: ToggleHistory;
  footprint?: FuturaFootprint;
  defaultOpen?: boolean;
  onToggle?: () => void;
}

/** A mode or switch on Futura's console: the cyan dial is the switch, the readout says ON or OFF, the meter its day. */
export function FuturaToggleCard({ entity: e, history, footprint = "standard", defaultOpen = false, onToggle }: FuturaToggleCardProps) {
  const unavailable = e.state === "unavailable";
  const on = e.state === "on";
  const status = on ? (e.until ? `On until ${e.until}` : "On") : "Off";
  const lead = onToggle ? <FuturaDialKey label={`Power, ${e.name}`} pressed={on} onPress={onToggle} unavailable={unavailable} level={on ? 1 : 0} tone="cyan"><IconToggle icon={e.icon} /></FuturaDialKey> : undefined;
  const changed: FuturaStat = e.lastSeen ? { label: "Last seen", value: e.lastSeen } : { label: "Changed", value: e.lastChanged ?? "—" };
  const stats: FuturaStat[] = [...(history ? [{ label: "On today", value: fmtDuration(history.onMinutes) }] : []), ...(on && e.until ? [{ label: "Until", value: e.until }] : []), changed];
  const meter = history ? { samples: history.samples, currentHour: history.currentHour, caption: history.onMinutes > 0 ? `On ${fmtDuration(history.onMinutes)}` : "Off all day" } : undefined;
  return (
    <FuturaCardFrame name={e.name} area={e.area} state={e.state} summary={<FuturaReadout value={on ? "ON" : "OFF"} />} icon={<IconToggle icon={e.icon} />} level={on ? 1 : 0} tone="cyan" lit={on} lead={lead} status={status} meter={meter} footprint={footprint} stats={stats} defaultOpen={defaultOpen}>
      {e.description && <p className="toggle-description">{e.description}</p>}
      <FuturaStats facts items={[
        ...(unavailable ? [] : [{ label: "State", value: on ? "On" : "Off" }]),
        ...(e.until ? [{ label: "Until", value: e.until }] : []),
        ...(e.duration ? [{ label: "Set for", value: e.duration === "manual" ? "Until turned off" : `${e.duration} min` }] : []),
        ...(history ? [{ label: "On today", value: fmtDuration(history.onMinutes) }] : []),
        changed,
        { label: "Entity", value: e.entityId },
      ]} />
    </FuturaCardFrame>
  );
}

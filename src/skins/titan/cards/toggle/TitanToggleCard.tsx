import type { ToggleEntity, ToggleHistory } from "@dashhaus/core/entities/toggle/types";
import { todaySummary } from "@dashhaus/core/entities/today";
import { lastSeenFact, sinceFact, unavailableSince } from "@dashhaus/core/entities/facts";
import { TitanAction, TitanCardFrame } from "../../shared/ui";
import type { TitanFootprint } from "../../shared/ui";
import "./TitanToggleCard.css";

export interface TitanToggleCardProps {
  entity: ToggleEntity;
  history?: ToggleHistory;
  footprint?: TitanFootprint;
  defaultOpen?: boolean;
  onToggle?: () => void;
}

/**
 * A switch or a mode: ON or OFF as the big word, a two-key selector (OFF and ON, the current one lit) where a press
 * on the other one switches it, and today's hours on as the dot strip.
 */
export function TitanToggleCard({ entity: e, history, footprint = "standard", defaultOpen = false, onToggle }: TitanToggleCardProps) {
  const unavailable = e.state === "unavailable";
  const on = e.state === "on";
  const status = e.until && on ? `On until ${e.until}` : e.lastChanged ? `Since ${e.lastChanged}` : e.description ?? (on ? "On" : "Off");
  const today = history && { samples: history.samples, currentHour: history.currentHour, summary: unavailable ? unavailableSince(e.lastSeen) : todaySummary("on", history.onMinutes) };
  const actions = onToggle && (
    <>
      <TitanAction label="Off" ariaLabel={`${e.name} off`} pressed={!on && !unavailable} unavailable={unavailable} tone="frame" onPress={() => { if (on) onToggle(); }} />
      <TitanAction label="On" ariaLabel={`${e.name} on`} pressed={on} unavailable={unavailable} onPress={() => { if (!on) onToggle(); }} />
    </>
  );
  return (
    <TitanCardFrame
      card="toggle" code="SW" entityId={e.entityId} name={e.name} area={e.area} state={e.state}
      status={status} summary={on ? "ON" : "OFF"} tone={on ? "on" : "idle"} today={today || undefined}
      gauge={<span className="titan-rail titan-toggle-rail" data-on={on ? "" : undefined} aria-hidden="true"><span /></span>}
      actions={actions || undefined} footprint={footprint} defaultOpen={defaultOpen}
      facts={[
        ["State", unavailable ? "Unavailable" : on ? "On" : "Off"],
        e.description && ["Does", e.description],
        e.until && ["Until", e.until],
        !unavailable && ["Since", sinceFact(e.lastChanged)?.replace(/^Since /, "")],
        unavailable && ["Last seen", lastSeenFact(e.lastSeen).replace(/^Last seen /, "")],
      ]}
    />
  );
}

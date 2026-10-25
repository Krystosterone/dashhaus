import type { ToggleEntity } from "../domains/toggle/types";
import { GlassCard, PowerButton } from "./ui";
import type { GlassSize } from "./ui";
import "./cards.css";
import { ToggleGlyph } from "./icons";

export interface GlassToggleCardProps {
  entity: ToggleEntity;
  onToggle: () => void;
  size?: GlassSize;
}

/** One input_boolean or switch: its icon as the card's picture, and since when it has been on or off. */
export function GlassToggleCard({ entity: e, onToggle, size = "s" }: GlassToggleCardProps) {
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // The dashed dot and button already say unavailable (the dot aloud); a small card's one line says since when.
  const line = unav
    ? e.lastSeen ? `Last seen ${e.lastSeen}` : "Unavailable"
    : on && e.until ? `On until ${e.until}` : `${on ? "On" : "Off"}${e.lastChanged ? ` since ${e.lastChanged}` : ""}`;
  return (
    <GlassCard
      size={size}
      name={e.name}
      subtitle={e.area}
      icon={<ToggleGlyph icon={e.icon} />}
      state={unav ? "unavailable" : on ? "on" : "off"}
      action={<PowerButton label={e.name} on={on} unavailable={unav} onToggle={onToggle} />}
    >
      <p className="gl-quiet" title={line}>{line}</p>
    </GlassCard>
  );
}

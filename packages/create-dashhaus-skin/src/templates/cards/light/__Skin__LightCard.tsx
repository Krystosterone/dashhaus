import { Action } from "../../shared/ui";

const CARD_CODE = "lt";

export interface __Skin__LightCardProps {
  name: string;
  area?: string;
  on: boolean;
  unavailable?: boolean;
  brightness?: number;
  onToggle: () => void;
}

/** One light: its name, its room, the reading, and one button that switches it. */
export function __Skin__LightCard({ name, area, on, unavailable = false, brightness, onToggle }: __Skin__LightCardProps) {
  const reading = unavailable ? "—" : on ? (brightness == null ? "On" : `${brightness}%`) : "Off";
  return (
    <article className="__skin__-lt-card" data-card-code={CARD_CODE} data-state={unavailable ? "unavailable" : on ? "on" : "off"}>
      <header className="__skin__-lt-head">
        <h3 className="__skin__-lt-name">{name}</h3>
        <p className="__skin__-lt-area">{area ?? "No area"}</p>
      </header>
      <p className="__skin__-lt-reading">{reading}</p>
      <Action label={on ? "On" : "Off"} onPress={onToggle} pressed={on} unavailable={unavailable} />
    </article>
  );
}

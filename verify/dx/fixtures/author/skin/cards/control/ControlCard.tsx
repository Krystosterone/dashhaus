import { usePress } from "@dashhaus/core/primitives";

const CARD_CODE = "ct";

export interface ControlCardProps {
  name: string;
  on: boolean;
  onToggle: () => void;
  unavailable?: boolean;
}

/** A control card on a real core primitive: one latching button, drawn by this skin. */
export function ControlCard({ name, on, onToggle, unavailable = false }: ControlCardProps) {
  const press = usePress({ onPress: onToggle, pressed: on, unavailable });
  return (
    <article className="fx-ct-card" data-card-code={CARD_CODE} data-state={unavailable ? "unavailable" : on ? "on" : "off"}>
      <header className="fx-ct-head">
        <span className="fx-ct-name">{name}</span>
      </header>
      <button className="fx-ct-button" {...press}>
        {on ? "On" : "Off"}
      </button>
    </article>
  );
}

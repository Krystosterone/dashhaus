import { usePress } from "@dashhaus/core/primitives";

interface KeyProps {
  label: string;
  on: boolean;
  unavailable: boolean;
  onToggle: () => void;
  onOpenDetails: () => void;
}

/** A latching key: a tap toggles, press and hold opens details, and an unavailable entity stays focusable. */
export function Key({ label, on, unavailable, onToggle, onOpenDetails }: KeyProps) {
  const press = usePress({ onPress: onToggle, onHold: onOpenDetails, pressed: on, unavailable });
  return (
    <button className="key" {...press}>
      {label}
    </button>
  );
}

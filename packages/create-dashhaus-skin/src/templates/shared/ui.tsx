import { usePress } from "@dashhaus/core/primitives";

/** A card's action: one latching button on the shared press primitive. */
export interface ActionProps {
  label: string;
  onPress: () => void;
  pressed?: boolean;
  unavailable?: boolean;
}

export function Action({ label, onPress, pressed, unavailable }: ActionProps) {
  const press = usePress({ onPress, pressed, unavailable });
  return <button type="button" className="__skin__-action" {...press}>{label}</button>;
}

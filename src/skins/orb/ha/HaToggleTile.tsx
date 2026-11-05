import { useHaToggle } from "@dashhaus/core";
import type { HaToggleOptions } from "@dashhaus/core";
import type { ToggleHandlers } from "@dashhaus/core";
import { ToggleTile } from "../cards/toggle/ToggleTile";
import type { ToggleTileProps } from "../cards/toggle/ToggleTile";

/** Orb draws no colour of a card's own, so it takes none of the hook's `color`. */
export interface HaToggleTileProps extends Omit<HaToggleOptions, "color">, Omit<ToggleTileProps, "entity" | "history" | keyof ToggleHandlers> {
  /** The Home Assistant entity id. */
  entityId: string;
}

/** A live toggle tile: the useHaToggle hook above the presentational tile. */
export function HaToggleTile({ entityId, name, area, lastSeen, icon, description, history, loadHistory, onActionError, ...props }: HaToggleTileProps) {
  const toggle = useHaToggle(entityId, { name, area, lastSeen, icon, description, history, loadHistory, onActionError });
  return <ToggleTile {...props} entity={toggle.entity} history={toggle.history} {...toggle.actions} />;
}

import { useHaToggle } from "./hooks/toggle";
import type { HaToggleOptions } from "./hooks/toggle";
import type { ToggleHandlers } from "./actions/toggle";
import { ToggleTile } from "../widgets/toggle/ToggleTile";
import type { ToggleTileProps } from "../widgets/toggle/ToggleTile";

/** `color` names the entity's colour (see useHaToggle); it replaces the tile's own `color` prop. */
export interface HaToggleTileProps extends HaToggleOptions, Omit<ToggleTileProps, "entity" | "history" | "color" | keyof ToggleHandlers> {
  entityId: string;
}

/** A live toggle tile: the useHaToggle hook above the presentational tile. */
export function HaToggleTile({ entityId, domain, name, area, lastSeen, icon, color, description, history, loadHistory, onActionError, ...props }: HaToggleTileProps) {
  const toggle = useHaToggle(entityId, { domain, name, area, lastSeen, icon, color, description, history, loadHistory, onActionError });
  return <ToggleTile {...props} entity={toggle.entity} history={toggle.history} {...toggle.actions} />;
}

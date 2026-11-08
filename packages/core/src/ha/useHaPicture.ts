import { useCallback, useMemo } from "react";
import { picturePath, resolvePicture } from "./picture";
import { useHaEntity, useHaMoreInfoHost, useHaStore } from "./provider";

/**
 * An entity's own picture (`entity_picture`: a camera's still, a player's artwork) as a URL this page can load,
 * resolved by the connection that serves it; nothing while the entity is missing, unavailable or unknown, or names
 * none. A picture follows the attribute, so a rotated token or a new track is a new URL. Draw it with `usePicture`
 * (`@dashhaus/core/hooks`), which owns loading and refreshing it.
 */
export function useHaPicture(entityId: string | undefined): string | undefined {
  const store = useHaStore();
  const path = picturePath(useHaEntity(entityId ?? ""));
  return useMemo(
    () => (path && store.resolveUrl ? store.resolveUrl(path) : resolvePicture(path)),
    [store, path],
  );
}

/**
 * Open the host's own dialog for an entity: inside Home Assistant, its more-info dialog, which plays a camera's live
 * stream with Home Assistant's own player. Nothing where the host has none (Storybook, a demo, a standalone app), so a
 * card falls back to its own details rather than drawing a control that opens nothing.
 */
export function useHaMoreInfo(entityId: string | undefined): (() => void) | undefined {
  const host = useHaMoreInfoHost();
  const open = useCallback(() => { if (entityId) host?.(entityId); }, [host, entityId]);
  return host && entityId ? open : undefined;
}

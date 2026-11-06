import { useMemo } from "react";
import { useHaEntity, useHaStore } from "../provider";
import { createGuestWifiHandlers } from "../actions/guestWifi";
import type { GuestWifiHandlers } from "../actions/guestWifi";
import { guestWifiCompanions, guestWifiFromHass } from "../mappers/guestWifi";
import { useHaArea } from "../registry";
import { checkEntityId } from "../dev";
import { useNow } from "../../hooks/useNow";
import type { GuestWifiEntity } from "../../entities/guestWifi/types";
import type { HaActionError } from "../types";

export interface HaGuestWifiOptions {
  /** `code` (an open network whose page asks for a code) or `password` (a Wi-Fi password). Default: `code` for a `sensor.*`, `password` for an `input_text.*` or `text.*`. */
  access?: "code" | "password";
  /** The network's name, where Home Assistant names none. Default: UniFi Hotspot Manager's `wlan_name`. */
  network?: string;
  /** The join QR code's `image.*`. Default: `image.<site>_qr_code` beside `sensor.<site>_voucher`. */
  qrEntityId?: string;
  /** What makes a new code or password: a `button.*`, `input_button.*` or `script.*`. Default: `button.<site>_create`. */
  newCodeEntityId?: string;
  /** What fetches the code again: a `button.*`, `input_button.*` or `script.*`. Default: `button.<site>_update`. */
  refreshEntityId?: string;
  /** Overrides the default name, "Guest Wi-Fi". */
  name?: string;
  /** Overrides the area Home Assistant's registries resolve for the entity. */
  area?: string;
  /** Overrides when the entity was last reachable, shown while it is unavailable. */
  lastSeen?: string;
  /** Called with an HaActionError when an action is refused or fails. */
  onActionError?: (error: HaActionError) => void;
}

export interface HaGuestWifiResult {
  entity: GuestWifiEntity;
  actions: GuestWifiHandlers;
}

/**
 * One live guest Wi-Fi for any UI: the code or password, its network and join QR code mapped together, and the two
 * actions that fetch it again and make a new one. UniFi Hotspot Manager's companions are found beside its
 * `sensor.<site>_voucher`; name any other's. No history: a code's day is when it was made and how often it was used.
 */
export function useHaGuestWifi(entityId: string, { access, network, qrEntityId, newCodeEntityId, refreshEntityId, name, area, lastSeen, onActionError }: HaGuestWifiOptions = {}): HaGuestWifiResult {
  checkEntityId(entityId, ["sensor", "input_text", "text"], "useHaGuestWifi");
  const store = useHaStore();
  const found = guestWifiCompanions(entityId);
  const ids = { qr: qrEntityId ?? found.qr, newCode: newCodeEntityId ?? found.newCode, refresh: refreshEntityId ?? found.refresh };
  const raw = useHaEntity(entityId);
  // No companion named or found: an id no entity has, so the hooks stay in the same order.
  const qrEntity = useHaEntity(ids.qr ?? "");
  const newCodeEntity = useHaEntity(ids.newCode ?? "");
  const refreshEntity = useHaEntity(ids.refresh ?? "");
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const entity = useMemo(
    () => guestWifiFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now, qrEntity, newCodeEntity, access, network }),
    [raw, entityId, name, area, registryArea, lastSeen, now, qrEntity, newCodeEntity, access, network],
  );
  const newCodeState = newCodeEntity?.state, refreshState = refreshEntity?.state;
  const actions = useMemo(() => createGuestWifiHandlers(store, {
    onError: onActionError,
    newCode: newCodeState == null || !ids.newCode ? undefined : { entityId: ids.newCode, state: newCodeState },
    refresh: refreshState == null || !ids.refresh ? undefined : { entityId: ids.refresh, state: refreshState },
  }), [store, onActionError, ids.newCode, newCodeState, ids.refresh, refreshState]);
  return { entity, actions };
}

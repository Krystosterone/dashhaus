import { useMemo } from "react";
import { useHaEntity } from "../provider";
import { sunFromHass } from "../mappers/sun";
import { useHaArea } from "../registry";
import { useHaRequest } from "../useHaRequest";
import { checkEntityId } from "../dev";
import { finiteNumber } from "../util";
import { useNow } from "../../hooks/useNow";
import { useHourCycle } from "../../hooks/hourCycle";
import { sunDay } from "../../entities/sun/position";
import type { HaStore } from "../types";
import type { SunEntity, SunHistory } from "../../entities/sun/types";

export interface HaSunOptions {
  /** Overrides Home Assistant's friendly name. */
  name?: string;
  /** Overrides the area Home Assistant's registries resolve. */
  area?: string;
  /** Overrides when the entity was last reachable, shown while it is unavailable. */
  lastSeen?: string;
  /** Where today's path is drawn from, in degrees; by default Home Assistant's own location (`get_config`). */
  latitude?: number;
  longitude?: number;
  /** Set false to leave out today's path (YAML `history: false`): `history` is then undefined. */
  loadHistory?: boolean;
}

export interface HaSunResult {
  entity: SunEntity;
  /** Today's path of the sun, worked out from the location: no recorder read. Undefined without a location, or with `loadHistory: false`. */
  history: SunHistory | undefined;
}

/** Home Assistant's configuration, read once per connection, for the home's location. */
const fetchConfig = (store: HaStore) => store.callApi("get_config") as Promise<{ latitude?: unknown; longitude?: unknown } | undefined>;

/**
 * The sun for any UI: the mapped `sun.*` entity, counted from the minute clock, and today's path, worked out from
 * the home's latitude and longitude (Home Assistant's `get_config`, read once per connection, or the options). It
 * sends no services.
 */
export function useHaSun(entityId: string, { name, area, lastSeen, latitude, longitude, loadHistory = true }: HaSunOptions = {}): HaSunResult {
  checkEntityId(entityId, ["sun"], "useHaSun");
  const raw = useHaEntity(entityId);
  const registryArea = useHaArea(entityId);
  const now = useNow();
  const hourCycle = useHourCycle();
  const given = latitude !== undefined && longitude !== undefined;
  const config = useHaRequest(loadHistory && !given ? "config" : undefined, fetchConfig, { cache: true }).value;
  const lat = given ? latitude : finiteNumber(config?.latitude);
  const lon = given ? longitude : finiteNumber(config?.longitude);
  const minute = now.getTime();
  const history = useMemo(
    () => (loadHistory && lat !== undefined && lon !== undefined ? sunDay(minute, lat, lon) : undefined),
    [loadHistory, lat, lon, minute],
  );
  const entity = useMemo(
    () => sunFromHass(raw, entityId, { name, area: area ?? registryArea, lastSeen, now, hourCycle }),
    [raw, entityId, name, area, registryArea, lastSeen, now, hourCycle],
  );
  return { entity, history };
}

import { useEffect, useMemo, useRef, useState } from "react";
import type { HaStore, HassEntity } from "./types";
import { historyRecords } from "./history";
import type { HaHistoryRecord } from "./history";
import { useHaStore } from "./provider";
import { useHaRequest } from "./useHaRequest";

interface RecordedDay {
  records: HaHistoryRecord[];
  /** The read's `end_time`; live records after it extend the recorded day. */
  until: number;
}

const localMidnight = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate());

async function fetchDay(store: HaStore, entityIds: readonly string[], day: number): Promise<RecordedDay> {
  const until = Date.now();
  // Attribute-only changes (brightness, position, hvac_action, weather temperature) are not
  // "significant", so ask for every row, with attributes.
  const response = await store.callApi("history/history_during_period", {
    entity_ids: [...entityIds],
    start_time: new Date(day).toISOString(),
    end_time: new Date(until).toISOString(),
    include_start_time_state: true,
    significant_changes_only: false,
    minimal_response: false,
    no_attributes: false,
  });
  return { records: historyRecords(response, entityIds), until };
}

function liveRecord(entityId: string, entity: HassEntity): HaHistoryRecord | undefined {
  const changed = new Date(entity.last_updated ?? entity.last_changed ?? Number.NaN);
  if (Number.isNaN(changed.getTime())) return undefined;
  return { entityId, state: entity.state, changed, attributes: entity.attributes };
}

/**
 * Today's history for one or more entities: the recorded day from Home Assistant
 * (`history/history_during_period`), extended by every live change seen since that read.
 *
 * The read is shared by callers asking for the same entities, and repeated for every new connection
 * generation and local day, so the strip rolls over at midnight. Any failure (including a transport
 * without `sendMessage`) collapses to `undefined`. Pass the tile's clock as `now` so the day follows it.
 */
export function useHaHistory(entityIds: readonly string[], load = true, now: Date = new Date()): HaHistoryRecord[] | undefined {
  const store = useHaStore();
  const idsKey = entityIds.join(",");
  const day = localMidnight(now).getTime();
  const idsRef = useRef(entityIds);
  idsRef.current = entityIds;
  const { value: recorded } = useHaRequest(
    load ? `history:${day}:${idsKey}` : undefined,
    (current) => fetchDay(current, idsRef.current, day),
  );
  const [live, setLive] = useState<HaHistoryRecord[]>([]);
  const until = useRef(0);
  until.current = recorded?.until ?? 0;

  useEffect(() => {
    setLive([]);
    if (!load) return;
    const ids = idsRef.current;
    const seen = new Map(ids.map((id) => [id, store.getSnapshot().entities[id]]));
    return store.subscribe(() => {
      const entities = store.getSnapshot().entities;
      const added: HaHistoryRecord[] = [];
      for (const id of ids) {
        const entity = entities[id];
        if (entity === seen.get(id)) continue;
        seen.set(id, entity);
        const record = entity ? liveRecord(id, entity) : undefined;
        if (record) added.push(record);
      }
      // Records the latest read already covers are dropped, so the tail stays short.
      if (added.length) setLive((current) => [...current, ...added].filter((record) => record.changed.getTime() > until.current));
    });
  }, [idsKey, load, store]);

  return useMemo(() => {
    if (!recorded) return undefined;
    const tail = live.filter((record) => record.changed.getTime() > recorded.until);
    return tail.length ? [...recorded.records, ...tail] : recorded.records;
  }, [recorded, live]);
}

import { useEffect, useRef, useState } from "react";
import type { HaStore } from "./types";
import { useHaGeneration, useHaStatus, useHaStore } from "./provider";

interface RequestCache {
  generation: number;
  requests: Map<string, Promise<unknown>>;
}

const caches = new WeakMap<HaStore, RequestCache>();

function sharedRequest<T>(store: HaStore, generation: number, key: string, fetch: () => Promise<T>, cache: boolean): Promise<T> {
  let entry = caches.get(store);
  if (!entry || entry.generation < generation) {
    entry = { generation, requests: new Map() };
    caches.set(store, entry);
  }
  // A late effect from an older generation must not reset or read the current generation's cache.
  if (entry.generation !== generation) return fetch();
  const existing = entry.requests.get(key);
  if (existing) return existing as Promise<T>;
  const request = fetch();
  const requests = entry.requests;
  requests.set(key, request);
  const evict = () => { if (requests.get(key) === request) requests.delete(key); };
  void request.then(cache ? undefined : evict, evict);
  return request;
}

export interface HaRequestOptions {
  /** Keep a successful result for the rest of the connection generation (registries). Default: share in-flight requests only. */
  cache?: boolean;
  /** Keep showing the previous key's value while the next key loads (an hourly forecast refresh). */
  keepPrevious?: boolean;
}

export interface HaRequestState<T> {
  value?: T;
  error?: unknown;
}

/**
 * One background read through the shared store, deduplicated across callers by store, connection
 * generation and `key`. It runs while connected, again for every new generation, and whenever `key`
 * changes; pass `undefined` to skip it. Results from an older generation are dropped, so a value
 * never outlives the connection that produced it.
 */
export function useHaRequest<T>(
  key: string | undefined,
  fetch: (store: HaStore) => Promise<T>,
  { cache = false, keepPrevious = false }: HaRequestOptions = {},
): HaRequestState<T> {
  const store = useHaStore();
  const status = useHaStatus();
  const generation = useHaGeneration();
  const [state, setState] = useState<HaRequestState<T> & { key?: string; generation?: number }>({});
  const fetchRef = useRef(fetch);
  fetchRef.current = fetch;

  useEffect(() => {
    if (key === undefined || status !== "connected") return;
    let cancelled = false;
    const isCurrent = () => (
      !cancelled
      && store.getSnapshot().generation === generation
      && store.getSnapshot().status === "connected"
    );
    sharedRequest(store, generation, key, () => fetchRef.current(store), cache).then(
      (value) => { if (isCurrent()) setState({ key, generation, value }); },
      (error: unknown) => { if (isCurrent()) setState({ key, generation, error }); },
    );
    return () => { cancelled = true; };
  }, [cache, generation, key, status, store]);

  const live = key !== undefined && status === "connected" && state.generation === generation;
  if (!live || (state.key !== key && !keepPrevious)) return {};
  return state;
}

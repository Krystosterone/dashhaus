import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { HaConnectionStatus, HaSnapshot, HaStore, HassEntity } from "./types";

const HaStoreContext = createContext<HaStore | null>(null);
const HaMoreInfoContext = createContext<((entityId: string) => void) | undefined>(undefined);

type StoreOwnership = { count: number };
const storeOwnership = new WeakMap<HaStore, StoreOwnership>();

function acquireStore(store: HaStore) {
  const ownership = storeOwnership.get(store) ?? { count: 0 };
  ownership.count += 1;
  storeOwnership.set(store, ownership);
  if (ownership.count === 1) void store.connect().catch(() => undefined);
}

function releaseStore(store: HaStore) {
  const ownership = storeOwnership.get(store);
  if (!ownership) return;
  ownership.count -= 1;
  if (ownership.count > 0) return;
  storeOwnership.delete(store);
  store.disconnect();
}

export interface HaProviderProps {
  /**
   * The store from createHaStore. The provider connects it while mounted and disconnects it after the last provider
   * using it unmounts; it never closes the transport.
   */
  store: HaStore;
  /**
   * Open the host's own dialog for an entity: Home Assistant's more-info, which plays a camera's live stream. The
   * Lovelace card base passes one; a host with no such dialog leaves it out, and `useHaMoreInfo` returns nothing.
   */
  moreInfo?: (entityId: string) => void;
  /** Your app. */
  children: ReactNode;
}

/** Own the store lifecycle at the application boundary, not inside a card. */
export function HaProvider({ store, moreInfo, children }: HaProviderProps) {
  const activeStore = useRef<HaStore | null>(null);
  const effectGeneration = useRef(0);

  useEffect(() => {
    const previousStore = activeStore.current;
    if (previousStore && previousStore !== store) {
      // A replacement is not a StrictMode replay; release the old ownership now.
      activeStore.current = null;
      releaseStore(previousStore);
    }
    if (activeStore.current !== store) {
      activeStore.current = store;
      acquireStore(store);
    }
    const currentEffect = ++effectGeneration.current;

    return () => {
      // React StrictMode replays effects synchronously. Defer cleanup one microtask so the replay can reuse the live store.
      queueMicrotask(() => {
        // The ref is a lifecycle token, not a DOM ref; its current value must be read at cleanup time.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        if (effectGeneration.current !== currentEffect || activeStore.current !== store) return;
        activeStore.current = null;
        releaseStore(store);
      });
    };
  }, [store]);

  return (
    <HaStoreContext.Provider value={store}>
      <HaMoreInfoContext.Provider value={moreInfo}>{children}</HaMoreInfoContext.Provider>
    </HaStoreContext.Provider>
  );
}

/** The host's `moreInfo`, from the nearest `HaProvider`. */
export function useHaMoreInfoHost(): ((entityId: string) => void) | undefined {
  return useContext(HaMoreInfoContext);
}

export function useHaStore() {
  const store = useContext(HaStoreContext);
  if (!store) throw new Error("useHaStore must be used inside HaProvider");
  return store;
}

/** The whole snapshot; re-renders on every entity change in the house. Prefer a narrower hook. */
export function useHaSnapshot(): HaSnapshot {
  const store = useHaStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/**
 * Select one value from the snapshot; the caller re-renders only when it changes (`Object.is`).
 * The selector must return a stable value: a primitive, or an object the store already holds.
 */
export function useHaSelector<T>(selector: (snapshot: HaSnapshot) => T): T {
  const store = useHaStore();
  const select = () => selector(store.getSnapshot());
  return useSyncExternalStore(store.subscribe, select, select);
}

/** One raw entity. Unchanged entities keep their identity across updates, so other entities' changes don't re-render. */
export function useHaEntity(entityId: string): HassEntity | undefined {
  return useHaSelector((snapshot) => snapshot.entities[entityId]);
}

/**
 * Several raw entities, in the order asked. The list keeps its identity until one of these entities changes,
 * so a tile composed of many entities re-renders for its own, never for the rest of the house.
 */
export function useHaEntities(entityIds: readonly string[]): ReadonlyArray<HassEntity | undefined> {
  const store = useHaStore();
  const key = entityIds.join("\n");
  const last = useRef<{ key: string; entities: ReadonlyArray<HassEntity | undefined> } | null>(null);
  const select = () => {
    const all = store.getSnapshot().entities;
    const next = key === "" ? [] : key.split("\n").map((id) => all[id]);
    const prev = last.current;
    if (prev && prev.key === key && prev.entities.every((entity, i) => entity === next[i])) return prev.entities;
    last.current = { key, entities: next };
    return next;
  };
  return useSyncExternalStore(store.subscribe, select, select);
}

export function useHaStatus(): HaConnectionStatus {
  return useHaSelector((snapshot) => snapshot.status);
}

export function useHaGeneration(): number {
  return useHaSelector((snapshot) => snapshot.generation);
}

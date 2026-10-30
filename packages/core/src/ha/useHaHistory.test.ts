import { createElement, StrictMode } from "react";
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import { useHaHistory } from "./useHaHistory";
import type { HaStore, HaTransport, HassEntities } from "./types";

const entities: HassEntities = {
  "light.living_room": {
    entity_id: "light.living_room",
    state: "on",
    attributes: { brightness: 196 },
    last_changed: "2026-10-20T10:00:00Z",
    last_updated: "2026-10-20T10:00:00Z",
  },
};

/** `history/history_during_period` wire shape: compressed rows keyed by entity id. */
const historyResponse = {
  "light.living_room": [{ s: "on", a: { brightness: 196 }, lu: Date.parse("2026-10-20T09:00:00Z") / 1000 }],
};
const historyRecords = [
  { entityId: "light.living_room", state: "on", attributes: { brightness: 196 }, changed: new Date("2026-10-20T09:00:00Z") },
];

function wrap(store: HaStore) {
  return ({ children }: { children: ReactNode }) => createElement(HaProvider, { store, children });
}

function strictWrap(store: HaStore) {
  return ({ children }: { children: ReactNode }) =>
    createElement(StrictMode, null, createElement(HaProvider, { store, children }));
}

describe("useHaHistory", () => {
  it("parses the history response into records once connected", async () => {
    const sendMessage = vi.fn(async () => historyResponse);
    const value: HaTransport = {
      subscribeEntities(listener) { queueMicrotask(() => listener(entities)); return () => undefined; },
      sendMessage,
      callService: async () => undefined,
    };
    const store = createHaStore(value);

    const { result } = renderHook(() => useHaHistory(["light.living_room"]), { wrapper: wrap(store) });

    await waitFor(() => expect(result.current).toEqual(historyRecords));
    expect(sendMessage).toHaveBeenCalledWith("history/history_during_period", expect.objectContaining({
      entity_ids: ["light.living_room"],
      significant_changes_only: false,
      no_attributes: false,
    }));
  });

  it("fetches nothing when load is false", async () => {
    const sendMessage = vi.fn(async () => historyResponse);
    const value: HaTransport = {
      subscribeEntities(listener) { queueMicrotask(() => listener(entities)); return () => undefined; },
      sendMessage,
      callService: async () => undefined,
    };
    const store = createHaStore(value);

    const { result } = renderHook(() => useHaHistory(["light.living_room"], false), { wrapper: wrap(store) });

    await act(async () => { await Promise.resolve(); });
    expect(sendMessage).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it("collapses a rejected request to undefined", async () => {
    const sendMessage = vi.fn(async () => { throw new Error("no recorder"); });
    const value: HaTransport = {
      subscribeEntities(listener) { queueMicrotask(() => listener(entities)); return () => undefined; },
      sendMessage,
      callService: async () => undefined,
    };
    const store = createHaStore(value);

    const { result } = renderHook(() => useHaHistory(["light.living_room"]), { wrapper: wrap(store) });

    await waitFor(() => expect(sendMessage).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });
    expect(result.current).toBeUndefined();
  });

  it("deduplicates in-flight requests across StrictMode effect replay", async () => {
    const sendMessage = vi.fn(async () => historyResponse);
    const value: HaTransport = {
      subscribeEntities(listener) { queueMicrotask(() => listener(entities)); return () => undefined; },
      sendMessage,
      callService: async () => undefined,
    };
    const store = createHaStore(value);
    await store.connect();

    const { result } = renderHook(() => useHaHistory(["light.living_room"]), { wrapper: strictWrap(store) });

    await waitFor(() => expect(result.current).toEqual(historyRecords));
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it("ignores a result that lands after the generation advanced", async () => {
    const pending: Array<(value: unknown) => void> = [];
    const listeners: Array<(entities: HassEntities) => void> = [];
    let emitConnection: ((status: "connected" | "disconnected" | "error") => void) | undefined;
    const sendMessage = vi.fn(() => new Promise((resolve) => { pending.push(resolve); }));
    const value: HaTransport = {
      subscribeConnection(listener) { emitConnection = listener; return () => undefined; },
      subscribeEntities(listener) { listeners.push(listener); return () => undefined; },
      sendMessage,
      callService: async () => undefined,
    };
    const store = createHaStore(value);

    const { result } = renderHook(() => useHaHistory(["light.living_room"]), { wrapper: wrap(store) });

    await waitFor(() => expect(listeners).toHaveLength(1));
    await act(async () => { listeners[0](entities); });
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));

    // Lose and recover the connection while the first request is still in flight; the
    // transport resubscribes itself and delivers a fresh snapshot.
    await act(async () => {
      emitConnection?.("disconnected");
      emitConnection?.("connected");
      listeners[0](entities);
    });
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));

    // Resolve the stale (first) request; it must not surface.
    await act(async () => { pending[0](historyResponse); });
    expect(result.current).toBeUndefined();

    // Resolve the current request; it surfaces.
    await act(async () => { pending[1](historyResponse); });
    await waitFor(() => expect(result.current).toEqual(historyRecords));
  });

  it("extends the fetched day with live changes seen after the read", async () => {
    const listeners: Array<(entities: HassEntities) => void> = [];
    const sendMessage = vi.fn(async () => historyResponse);
    const value: HaTransport = {
      subscribeEntities(listener) { listeners.push(listener); queueMicrotask(() => listener(entities)); return () => undefined; },
      sendMessage,
      callService: async () => undefined,
    };
    const store = createHaStore(value);

    const { result } = renderHook(() => useHaHistory(["light.living_room"]), { wrapper: wrap(store) });
    await waitFor(() => expect(result.current).toEqual(historyRecords));

    const later = new Date(Date.now() + 60_000).toISOString();
    await act(async () => {
      listeners[0]({
        "light.living_room": { ...entities["light.living_room"], state: "off", attributes: {}, last_changed: later, last_updated: later },
      });
    });

    expect(result.current).toEqual([
      ...historyRecords,
      { entityId: "light.living_room", state: "off", attributes: {}, changed: new Date(later) },
    ]);
  });

  it("reads the new day again when the clock passes local midnight", async () => {
    const sendMessage = vi.fn(async () => historyResponse);
    const value: HaTransport = {
      subscribeEntities(listener) { queueMicrotask(() => listener(entities)); return () => undefined; },
      sendMessage,
      callService: async () => undefined,
    };
    const store = createHaStore(value);
    const before = new Date(2026, 9, 20, 23, 59);
    const after = new Date(2026, 9, 21, 0, 1);

    const { rerender } = renderHook(({ now }) => useHaHistory(["light.living_room"], true, now), {
      wrapper: wrap(store),
      initialProps: { now: before },
    });
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    rerender({ now: new Date(2026, 9, 20, 23, 59, 30) });
    rerender({ now: after });
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));

    const startTimes = sendMessage.mock.calls.map((call) => (call as unknown[])[1] as { start_time: string }).map((payload) => payload.start_time);
    expect(startTimes).toEqual([new Date(2026, 9, 20).toISOString(), new Date(2026, 9, 21).toISOString()]);
  });
});

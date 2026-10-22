import { createElement } from "react";
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaProvider } from "./provider";
import { useHaRequest } from "./useHaRequest";
import type { HaSnapshot, HaStore } from "./types";

function connectedStore(): HaStore {
  const snapshot: HaSnapshot = { status: "connected", entities: {}, generation: 1 };
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(),
    callService: vi.fn(async () => undefined),
    query: vi.fn(async () => undefined),
    callApi: vi.fn(async () => undefined),
  };
}

const wrap = (store: HaStore) => ({ children }: { children: ReactNode }) => createElement(HaProvider, { store, children });

describe("useHaRequest", () => {
  it("shares in-flight reads but reads again once settled, unless cached", async () => {
    const store = connectedStore();
    const fetch = vi.fn(async () => "value");

    const first = renderHook(() => useHaRequest("k", fetch), { wrapper: wrap(store) });
    await waitFor(() => expect(first.result.current.value).toBe("value"));
    const second = renderHook(() => useHaRequest("k", fetch), { wrapper: wrap(store) });
    await waitFor(() => expect(second.result.current.value).toBe("value"));
    expect(fetch).toHaveBeenCalledTimes(2);

    const cachedFetch = vi.fn(async () => "cached");
    const third = renderHook(() => useHaRequest("c", cachedFetch, { cache: true }), { wrapper: wrap(store) });
    await waitFor(() => expect(third.result.current.value).toBe("cached"));
    const fourth = renderHook(() => useHaRequest("c", cachedFetch, { cache: true }), { wrapper: wrap(store) });
    await waitFor(() => expect(fourth.result.current.value).toBe("cached"));
    expect(cachedFetch).toHaveBeenCalledTimes(1);
  });

  it("drops the value on a key change unless keepPrevious is set", async () => {
    const store = connectedStore();
    let release: (value: string) => void = () => undefined;
    const fetch = vi.fn((_store: HaStore) => new Promise<string>((resolve) => { release = resolve; }));

    const plain = renderHook(({ key }) => useHaRequest(key, fetch), { wrapper: wrap(store), initialProps: { key: "a" } });
    release("A");
    await waitFor(() => expect(plain.result.current.value).toBe("A"));
    plain.rerender({ key: "b" });
    expect(plain.result.current.value).toBeUndefined();

    const kept = renderHook(({ key }) => useHaRequest(key, fetch, { keepPrevious: true }), { wrapper: wrap(store), initialProps: { key: "x" } });
    release("X");
    await waitFor(() => expect(kept.result.current.value).toBe("X"));
    kept.rerender({ key: "y" });
    expect(kept.result.current.value).toBe("X");
    release("Y");
    await waitFor(() => expect(kept.result.current.value).toBe("Y"));
  });

  it("reports a failure as error and skips an undefined key", async () => {
    const store = connectedStore();
    const failure = new Error("no");
    const failing = renderHook(() => useHaRequest("e", async () => { throw failure; }), { wrapper: wrap(store) });
    await waitFor(() => expect(failing.result.current.error).toBe(failure));

    const fetch = vi.fn(async () => "never");
    const skipped = renderHook(() => useHaRequest(undefined, fetch), { wrapper: wrap(store) });
    expect(skipped.result.current).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });
});

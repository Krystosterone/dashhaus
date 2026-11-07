import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const load = async () => {
  vi.resetModules();
  return import("./perf");
};

/**
 * The tests install their own Storage: newer Node versions define a global `localStorage` that is unavailable
 * without `--localstorage-file` (undefined on Node 26, a methodless stub on Node 25) and it shadows jsdom's, so
 * the environment's own storage is not trustworthy. `perf` reads one key, which this in-memory Storage serves.
 */
const storage = new Map<string, string>();
const storageShim: Storage = {
  get length() { return storage.size; },
  key: (index: number) => [...storage.keys()][index] ?? null,
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, String(value)); },
  removeItem: (key: string) => { storage.delete(key); },
  clear: () => { storage.clear(); },
};

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  storage.clear();
  vi.stubGlobal("localStorage", storageShim);
  delete window.__dashhausPerf;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("performance marks", () => {
  it("stays off and records nothing without an opt-in", async () => {
    const perf = await load();
    expect(perf.perfEnabled()).toBe(false);
    perf.perfMark("render:start");
    expect(window.__dashhausPerf).toBeUndefined();
  });

  it("turns on from the query, keeping mark names and defined details", async () => {
    window.history.replaceState(null, "", "/?dashhaus_perf=1");
    const perf = await load();
    expect(perf.perfEnabled()).toBe(true);
    perf.perfMark("render:start", { first: true, label: undefined, seq: 2 });
    expect(perf.perfEnabled()).toBe(true);
    expect(window.__dashhausPerf?.marks).toEqual([
      expect.objectContaining({ name: "render:start", detail: { first: true, seq: 2 } }),
    ]);
  });

  it("turns on from storage", async () => {
    window.localStorage.setItem("dashhaus:perf", "1");
    const perf = await load();
    expect(perf.perfEnabled()).toBe(true);
    perf.perfMark("resource:entry");
    expect(window.__dashhausPerf?.marks.map((mark) => mark.name)).toEqual(["resource:entry"]);
  });

  it("marks after paint, or immediately where the frame API is absent", async () => {
    window.history.replaceState(null, "", "/?dashhaus_perf=1");
    vi.stubGlobal("requestAnimationFrame", (callback: (time: number) => void) => {
      callback(0);
      return 0;
    });
    const perf = await load();
    perf.perfMarkAfterPaint("details:visible", { label: "Kitchen details" });
    expect(window.__dashhausPerf?.marks.map((mark) => mark.name)).toEqual(["details:visible"]);
  });
});

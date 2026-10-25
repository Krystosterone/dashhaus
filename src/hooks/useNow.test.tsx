import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNow } from "./useNow";

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});
afterEach(() => vi.useRealTimers());

describe("useNow", () => {
  it("freezes on a fixed date", () => {
    const fixed = new Date("2026-10-18T12:34:56");
    vi.setSystemTime(fixed);
    const { result } = renderHook(() => useNow(fixed));
    act(() => vi.advanceTimersByTime(10 * 60_000));
    expect(result.current.getTime()).toBe(fixed.getTime());
  });

  it("starts at the current time", () => {
    vi.setSystemTime(new Date("2026-10-18T12:00:00"));
    const { result } = renderHook(() => useNow());
    expect(result.current.getTime()).toBe(new Date("2026-10-18T12:00:00").getTime());
  });

  it("ticks onto the next minute boundary", () => {
    vi.setSystemTime(new Date("2026-10-18T12:00:00"));
    const { result } = renderHook(() => useNow());
    act(() => vi.advanceTimersByTime(60_100));
    expect(result.current.getMinutes()).toBe(1);
    expect(result.current.getSeconds()).toBe(0);
  });

  it("catches up when the page becomes visible again", () => {
    vi.setSystemTime(new Date("2026-10-18T12:00:00"));
    const { result } = renderHook(() => useNow());
    act(() => vi.advanceTimersByTime(60_000));
    vi.setSystemTime(new Date("2026-10-18T13:00:00"));
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current.getMinutes()).toBe(0);
    expect(result.current.getHours()).toBe(13);
  });
});

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDelayLeft } from "./useDelayLeft";

const T0 = new Date("2026-10-18T12:00:00").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

describe("useDelayLeft", () => {
  it("counts down each second from when the delay started, and stops at zero", () => {
    const { result } = renderHook(() => useDelayLeft(30, T0 - 10_000, true));
    expect(result.current).toBe(20);
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe(15);
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current).toBe(0);
  });

  it("knows nothing without the delay's length or its start, or while inactive", () => {
    expect(renderHook(() => useDelayLeft(undefined, T0, true)).result.current).toBeUndefined();
    expect(renderHook(() => useDelayLeft(30, undefined, true)).result.current).toBeUndefined();
    expect(renderHook(() => useDelayLeft(30, T0, false)).result.current).toBeUndefined();
  });

  it("catches up when the page becomes visible again", () => {
    const { result } = renderHook(() => useDelayLeft(60, T0, true));
    vi.setSystemTime(T0 + 45_000);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current).toBe(15);
  });
});

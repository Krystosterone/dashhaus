import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { SETTLE_MS, useSettled } from "./useSettled";

describe("useSettled", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("refuses a press until the control has been on screen for a moment", () => {
    const { result } = renderHook(() => useSettled());
    expect(result.current()).toBe(false);
    vi.advanceTimersByTime(SETTLE_MS - 1);
    expect(result.current()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(result.current()).toBe(true);
  });

  it("takes its own wait", () => {
    const { result } = renderHook(() => useSettled(0));
    expect(result.current()).toBe(true);
  });
});

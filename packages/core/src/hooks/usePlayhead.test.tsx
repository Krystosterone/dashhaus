import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayhead } from "./usePlayhead";
import type { MediaPlayerEntity } from "../entities/mediaPlayer/types";

type Input = Pick<MediaPlayerEntity, "state" | "duration" | "position" | "positionAt">;
const T = Date.UTC(2026, 9, 19, 11, 54);

describe("usePlayhead", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(T); });
  afterEach(() => { vi.useRealTimers(); });

  it("works out where it is once, from the time it was read, and not again as time passes", () => {
    const { result, rerender } = renderHook((e: Input) => usePlayhead(e), { initialProps: { state: "playing", duration: 240, position: 60, positionAt: T - 30_000 } });
    expect(result.current).toMatchObject({ at: 90, running: true });
    const first = result.current;
    vi.setSystemTime(T + 45_000);
    rerender({ state: "playing", duration: 240, position: 60, positionAt: T - 30_000 });
    expect(result.current).toBe(first);
  });

  it("starts again, with a new key, when the position, the state or the track changes", () => {
    const { result, rerender } = renderHook((e: Input) => usePlayhead(e), { initialProps: { state: "playing", duration: 240, position: 60, positionAt: T } });
    const key = result.current?.key;
    rerender({ state: "paused", duration: 240, position: 75, positionAt: T + 15_000 });
    expect(result.current).toMatchObject({ at: 75, running: false });
    expect(result.current?.key).not.toBe(key);
  });

  it("is nothing for a stream with no duration", () => {
    const { result } = renderHook(() => usePlayhead({ state: "playing", position: 600 }));
    expect(result.current).toBeUndefined();
  });
});

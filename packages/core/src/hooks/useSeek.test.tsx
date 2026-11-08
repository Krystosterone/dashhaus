import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSeek } from "./useSeek";
import type { PlayheadNow } from "./usePlayhead";

const T = Date.UTC(2026, 9, 19, 11, 54);
const playing: PlayheadNow = { at: 83, duration: 245, running: true, key: "playing|245|83|1" };

type Props = { head?: PlayheadNow; onSeek?: (s: number) => void | Promise<boolean> };
const mount = (props: Props) => renderHook(({ head, onSeek }: Props) => useSeek(head, onSeek), { initialProps: props });

describe("useSeek", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(T); });
  afterEach(() => { vi.useRealTimers(); });

  it("is nothing without a playhead or without a seek", () => {
    expect(mount({ onSeek: vi.fn() }).result.current).toBeUndefined();
    expect(mount({ head: playing }).result.current).toBeUndefined();
  });

  it("draws Home Assistant's playhead at rest, and slides along the track in steps of 5 seconds", () => {
    const { result } = mount({ head: playing, onSeek: vi.fn() });
    expect(result.current).toMatchObject({ head: playing, held: false, slider: { value: 83, min: 0, max: 245, step: 5 } });
    expect(result.current?.target).toBeUndefined();
    expect(result.current?.slider.valueText(151)).toBe("2 minutes 31 seconds of 4 minutes 5 seconds");
  });

  it("holds a draft while it moves, under the same key, and seeks once on release", async () => {
    const onSeek = vi.fn(async () => true);
    const { result } = mount({ head: playing, onSeek });
    act(() => result.current?.slider.onChange(120));
    act(() => result.current?.slider.onChange(151));
    expect(result.current).toMatchObject({ held: true, target: 151, head: { at: 151, running: false, key: playing.key } });
    expect(onSeek).not.toHaveBeenCalled();

    await act(async () => result.current?.slider.onCommit(151));
    expect(onSeek.mock.calls).toEqual([[151]]);
    expect(result.current?.held).toBe(false);
    // Let go: it runs on from there, under a key of its own, so its animations start again from there once.
    expect(result.current?.head).toMatchObject({ at: 151, running: true });
    expect(result.current?.head.key).not.toBe(playing.key);
  });

  it("keeps the seek until Home Assistant reports, then draws its truth", async () => {
    const { result, rerender } = mount({ head: playing, onSeek: vi.fn(async () => true) });
    await act(async () => result.current?.slider.onCommit(200));
    vi.setSystemTime(T + 3000);
    rerender({ head: playing, onSeek: vi.fn(async () => true) });
    expect(result.current?.head.at).toBe(200);
    const reported: PlayheadNow = { at: 203, duration: 245, running: true, key: "playing|245|203|2" };
    rerender({ head: reported, onSeek: vi.fn(async () => true) });
    expect(result.current?.head).toBe(reported);
  });

  it("drops the seek, with no snap of its own, when it is refused", async () => {
    const { result } = mount({ head: playing, onSeek: vi.fn(async () => false) });
    await act(async () => result.current?.slider.onCommit(200));
    expect(result.current?.head).toEqual(playing);
  });

  it("says where a running position is now, so a key steps from there rather than from the last render", () => {
    const { result } = mount({ head: playing, onSeek: vi.fn() });
    vi.setSystemTime(T + 12_000);
    expect(result.current?.slider.current()).toBe(95);
    const paused = mount({ head: { ...playing, running: false }, onSeek: vi.fn() });
    expect(paused.result.current?.slider.current()).toBe(83);
  });
});

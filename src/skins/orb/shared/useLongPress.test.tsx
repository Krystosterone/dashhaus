import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useLongPress } from "./useLongPress";

const down = { button: 0, clientX: 5, clientY: 5 } as unknown as ReactPointerEvent;
const move = (x: number, y: number) => ({ clientX: x, clientY: y }) as unknown as ReactPointerEvent;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useLongPress", () => {
  it("fires after the hold time", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, 450));
    act(() => result.current.handlers.onPointerDown(down));
    expect(result.current.holding).toBe(true);
    act(() => vi.advanceTimersByTime(449));
    expect(onLongPress).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(result.current.holding).toBe(false);
  });

  it("cancels when the pointer moves more than 10px", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));
    act(() => result.current.handlers.onPointerDown(down));
    act(() => result.current.handlers.onPointerMove(move(30, 5)));
    act(() => vi.advanceTimersByTime(600));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("ignores non-primary buttons", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));
    act(() => result.current.handlers.onPointerDown({ ...down, button: 2 }));
    act(() => vi.advanceTimersByTime(600));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("lets the click that ends a long press be consumed once", () => {
    const onLongPress = vi.fn();
    vi.setSystemTime(new Date("2026-10-18T12:00:00"));
    const { result } = renderHook(() => useLongPress(onLongPress));
    act(() => result.current.handlers.onPointerDown(down));
    act(() => vi.advanceTimersByTime(450));
    act(() => result.current.handlers.onPointerUp());
    expect(result.current.consumeLongPress()).toBe(true);
    expect(result.current.consumeLongPress()).toBe(false);
  });
});

import { act, fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useKeypad } from "./keypad";

const typed = (onSubmit: (code: string) => boolean | Promise<boolean>, text?: boolean) => renderHook(() => useKeypad({ onSubmit, text }));

describe("useKeypad", () => {
  it("types, deletes and submits the code", async () => {
    const onSubmit = vi.fn(() => true);
    const { result } = typed(onSubmit);
    act(() => { result.current.press("1"); result.current.press("2"); result.current.press("3"); });
    act(() => result.current.back());
    expect(result.current.code).toBe("12");
    await act(async () => { await result.current.submit(); });
    expect(onSubmit).toHaveBeenCalledWith("12");
    expect(result.current.error).toBeNull();
  });

  it("submits nothing empty", async () => {
    const onSubmit = vi.fn(() => true);
    const { result } = typed(onSubmit);
    await act(async () => { await result.current.submit(); });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears a wrong code for another try, and keeps one that didn't go through", async () => {
    let answer: () => boolean = () => false;
    const { result } = typed(() => answer());
    act(() => result.current.press("9"));
    await act(async () => { await result.current.submit(); });
    expect(result.current).toMatchObject({ error: "wrong", code: "" });

    answer = () => { throw new Error("offline"); };
    act(() => result.current.press("1"));
    await act(async () => { await result.current.submit(); });
    expect(result.current).toMatchObject({ error: "failed", code: "1" });
  });

  it("is busy while the answer is on its way, and ignores keys meanwhile", async () => {
    let resolve: (ok: boolean) => void = () => undefined;
    const { result } = typed(() => new Promise<boolean>((r) => { resolve = r; }));
    act(() => result.current.press("4"));
    let done: Promise<void> = Promise.resolve();
    act(() => { done = result.current.submit(); });
    expect(result.current.busy).toBe(true);
    act(() => result.current.press("5"));
    expect(result.current.code).toBe("4");
    await act(async () => { resolve(true); await done; });
    expect(result.current.busy).toBe(false);
  });

  it("types from a physical keyboard, letters only for a text code", async () => {
    const onSubmit = vi.fn(() => true);
    const { result } = typed(onSubmit);
    act(() => { fireEvent.keyDown(document, { key: "7" }); fireEvent.keyDown(document, { key: "a" }); });
    expect(result.current.code).toBe("7");
    act(() => { fireEvent.keyDown(document, { key: "Backspace" }); });
    expect(result.current.code).toBe("");

    const text = typed(onSubmit, true);
    act(() => { fireEvent.keyDown(document, { key: "a" }); });
    expect(text.result.current.code).toBe("a");
    await act(async () => { fireEvent.keyDown(document, { key: "Enter" }); await Promise.resolve(); });
    expect(onSubmit).toHaveBeenCalledWith("a");
  });
});

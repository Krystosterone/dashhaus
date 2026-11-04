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

  it("leaves a key typed in its input to the input, inside a shadow root as in Home Assistant", () => {
    const host = document.body.appendChild(document.createElement("div"));
    const field = host.attachShadow({ mode: "open" }).appendChild(document.createElement("input"));
    const { result } = typed(vi.fn(() => true), true);
    act(() => { field.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true, composed: true })); });
    expect(result.current.code).toBe("");
    host.remove();
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

  it("gives a text code a real input, so a touch screen brings up its keyboard", async () => {
    const onSubmit = vi.fn(() => true);
    expect(typed(onSubmit).result.current.inputProps, "a digit code needs no input").toBeUndefined();

    const { result } = typed(onSubmit, true);
    const input = result.current.inputProps!;
    expect(input).toMatchObject({ type: "password", autoComplete: "off", autoCapitalize: "off", "data-autofocus": true });
    expect(result.current.rootProps["data-autofocus"], "the input takes the focus, not the root").toBeUndefined();

    act(() => input.onChange({ currentTarget: { value: "Open Sesame 12345" } as HTMLInputElement }));
    expect(result.current.code, "as long as the longest code").toBe("Open Sesame ");
    act(() => result.current.press("1"));
    expect(result.current.code, "the digit keys type into the same code").toBe("Open Sesame ");
    act(() => result.current.type("door1"));
    const keyDown = { key: "Enter", preventDefault: vi.fn() };
    await act(async () => { result.current.inputProps!.onKeyDown(keyDown); await Promise.resolve(); });
    expect(keyDown.preventDefault).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledWith("door1");
  });
});

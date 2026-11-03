import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { actionKey, guardedOutcome, useGuardedAction } from "./guarded";
import type { GuardedActionOptions, GuardedResult } from "./guarded";

type Action = "lock" | "unlock";
const guard = (options: Partial<GuardedActionOptions<Action>> = {}) =>
  renderHook((props: Partial<GuardedActionOptions<Action>>) => useGuardedAction<Action>({ run: () => "done", needsCode: () => false, ...options, ...props }), { initialProps: {} });

describe("useGuardedAction", () => {
  it("asks, then runs on the question's yes and closes", async () => {
    const run = vi.fn((): GuardedResult => "done");
    const { result } = guard({ run });
    act(() => result.current.ask("unlock"));
    expect(result.current).toMatchObject({ pending: "unlock", code: false, busy: false, failed: false });
    expect(run).not.toHaveBeenCalled();
    await act(async () => { await result.current.confirm(); });
    expect(run).toHaveBeenCalledWith("unlock");
    expect(result.current.pending).toBeNull();
  });

  it("keeps the question on a call that didn't go through, and moves it to the keypad on a refused code", async () => {
    let answer: () => GuardedResult = () => { throw new Error("offline"); };
    const { result } = guard({ run: () => answer() });
    act(() => result.current.ask("unlock"));
    await act(async () => { await result.current.confirm(); });
    expect(result.current).toMatchObject({ pending: "unlock", failed: true, code: false });
    answer = () => "wrong_code";
    await act(async () => { await result.current.confirm(); });
    expect(result.current).toMatchObject({ pending: "unlock", code: true });
  });

  it("is busy while the answer is on its way", async () => {
    let resolve: () => void = () => undefined;
    const { result } = guard({ run: () => new Promise<void>((r) => { resolve = r; }) });
    act(() => result.current.ask("unlock"));
    let confirming: Promise<void> = Promise.resolve();
    act(() => { confirming = result.current.confirm(); });
    expect(result.current.busy).toBe(true);
    await act(async () => { resolve(); await confirming; });
    expect(result.current).toMatchObject({ busy: false, pending: null });
  });

  it("asks for the code first when the action takes one, and answers the keypad", async () => {
    const run = vi.fn((_a: Action, code?: string): GuardedResult => (code === "1234" ? "done" : "wrong_code"));
    const { result } = guard({ run, needsCode: (a) => a === "unlock" });
    await act(async () => { await result.current.attempt("unlock"); });
    expect(run).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ pending: "unlock", code: true });
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.submit("0000"); });
    expect(ok).toBe(false);
    expect(result.current.pending).toBe("unlock");
    await act(async () => { ok = await result.current.submit("1234"); });
    expect(ok).toBe(true);
    expect(result.current.pending).toBeNull();
  });

  it("throws from the keypad's submit when the call didn't go through, so the keypad keeps the code", async () => {
    const { result } = guard({ run: () => "failed", needsCode: () => true });
    act(() => result.current.ask("unlock"));
    await expect(result.current.submit("1")).rejects.toThrow();
  });

  it("runs a tap's action at once, and asks for the code when it turns out to want one", async () => {
    const run = vi.fn((): GuardedResult => "wrong_code");
    const { result } = guard({ run });
    let outcome: string | undefined;
    await act(async () => { outcome = await result.current.attempt("lock"); });
    expect(outcome).toBe("wrong_code");
    expect(result.current).toMatchObject({ pending: "lock", code: true });
  });

  it("hands the action over when it's asked elsewhere", async () => {
    const askElsewhere = vi.fn();
    const { result } = guard({ askElsewhere, run: () => "wrong_code" });
    act(() => result.current.ask("unlock"));
    await act(async () => { await result.current.attempt("lock"); });
    expect(askElsewhere.mock.calls).toEqual([["unlock"], ["lock"]]);
    expect(result.current.pending).toBeNull();
  });

  it("starts on its initial action, asks afresh when it changes, and closes when the entity gets there", () => {
    let there = false;
    const { result, rerender } = guard({ initial: "unlock", settled: () => there });
    expect(result.current.pending).toBe("unlock");
    rerender({ initial: "lock" });
    expect(result.current.pending).toBe("lock");
    there = true;
    rerender({ initial: "lock" });
    expect(result.current.pending).toBeNull();
  });

  it("does nothing while disabled", async () => {
    const run = vi.fn();
    const { result } = guard({ run, disabled: true, initial: "unlock" });
    expect(result.current.pending).toBeNull();
    act(() => result.current.ask("unlock"));
    await act(async () => { await result.current.attempt("lock"); });
    expect(result.current.pending).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it("closes on cancel", () => {
    const { result } = guard();
    act(() => result.current.ask("unlock"));
    act(() => result.current.close());
    expect(result.current.pending).toBeNull();
  });
});

describe("actionKey and guardedOutcome", () => {
  it("keys an action by value", () => {
    expect(actionKey("unlock")).toBe("unlock");
    expect(actionKey({ kind: "arm", mode: "away" })).toBe(actionKey({ kind: "arm", mode: "away" }));
  });

  it("reads nothing or true as done, false as a wrong code and a throw as failed", async () => {
    expect(await guardedOutcome(undefined)).toBe("done");
    expect(await guardedOutcome(true)).toBe("done");
    expect(await guardedOutcome(Promise.resolve(false))).toBe("wrong_code");
    expect(await guardedOutcome(Promise.resolve("wrong_code" as const))).toBe("wrong_code");
    expect(await guardedOutcome(() => { throw new Error("x"); })).toBe("failed");
    expect(await guardedOutcome(Promise.reject(new Error("x")))).toBe("failed");
  });
});

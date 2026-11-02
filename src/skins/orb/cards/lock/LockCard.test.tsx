import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LockCard } from "./LockCard";
import { SETTLE_MS } from "@dashhaus/core/hooks";
import type { LockEntity } from "@dashhaus/core/entities/lock/types";

const locked: LockEntity = { entityId: "lock.front_door", name: "Front door", area: "Hall", state: "locked", supportsOpen: true, codeFormat: null, lastChanged: "10:58", changedBy: "Keypad" };
const unlocked: LockEntity = { ...locked, state: "unlocked" };

afterEach(() => { vi.useRealTimers(); });

describe("LockCard", () => {
  it("is a state: no glow, locked or not, and the locked orb is the accent", () => {
    for (const entity of [locked, unlocked, { ...locked, state: "jammed" as const }]) {
      const { container, unmount } = render(<LockCard entity={entity} onLock={() => {}} onUnlock={() => {}} />);
      const card = container.querySelector("article");
      expect(card?.getAttribute("data-role")).toBe("state");
      expect(card?.getAttribute("data-glow")).toBeNull();
      unmount();
    }
  });

  it("locks on a tap of the orb or the pill", () => {
    const onLock = vi.fn();
    render(<LockCard entity={unlocked} onLock={onLock} onUnlock={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Lock Front door" }));
    fireEvent.click(screen.getByRole("button", { name: /^Front door: Unlocked · Lock/ }));
    expect(onLock).toHaveBeenCalledTimes(2);
  });

  it("never unlocks on a tap: the card asks the sheet to confirm", () => {
    const onUnlock = vi.fn();
    const onOpenDetails = vi.fn();
    render(<LockCard entity={locked} onLock={() => {}} onUnlock={onUnlock} onOpenDetails={onOpenDetails} />);
    fireEvent.click(screen.getByRole("button", { name: "Unlock Front door…" }));
    fireEvent.click(screen.getByRole("button", { name: /^Front door: Locked/ }));
    expect(onUnlock).not.toHaveBeenCalled();
    expect(onOpenDetails).toHaveBeenCalledWith("unlock");
  });

  it("confirms an unlock in the sheet, Cancel focused, ignoring a press that comes too soon", async () => {
    vi.useFakeTimers();
    const onUnlock = vi.fn(async () => "done" as const);
    render(<LockCard entity={locked} variant="sheet" action="unlock" onLock={() => {}} onUnlock={onUnlock} />);
    expect(document.activeElement?.textContent).toBe("Cancel");
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(onUnlock).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(SETTLE_MS); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Unlock" })); });
    expect(onUnlock).toHaveBeenCalledWith(undefined);
  });

  it("takes the code on its keypad when the lock asks for one", async () => {
    const onUnlock = vi.fn(async (code?: string) => (code === "1234" ? "done" as const : "wrong_code" as const));
    render(<LockCard entity={{ ...locked, codeFormat: "number", codePattern: "^\\d{4}$" }} variant="sheet" action="unlock" onLock={() => {}} onUnlock={onUnlock} />);
    for (const d of ["9", "9", "9", "9"]) fireEvent.click(screen.getByRole("button", { name: d }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Enter code" })); });
    expect(screen.getByText("Wrong code. Try again.")).toBeTruthy();
    for (const d of ["1", "2", "3", "4"]) fireEvent.click(screen.getByRole("button", { name: d }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Enter code" })); });
    expect(onUnlock).toHaveBeenLastCalledWith("1234");
    expect(screen.queryByRole("button", { name: "Enter code" })).toBeNull();
  });

  it("offers Open door in the sheet only where the lock can, behind the same confirmation", () => {
    const { rerender } = render(<LockCard entity={locked} variant="sheet" onLock={() => {}} onUnlock={() => {}} onOpenDoor={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Open door/ }));
    expect(screen.getByText("Open the door?")).toBeTruthy();
    rerender(<LockCard entity={{ ...locked, supportsOpen: false }} variant="sheet" onLock={() => {}} onUnlock={() => {}} onOpenDoor={() => {}} />);
    expect(screen.queryByText("Unlatch it")).toBeNull();
  });

  it("marks a jam on the status line and offers to lock again", () => {
    const onLock = vi.fn();
    render(<LockCard entity={{ ...locked, state: "jammed" }} onLock={onLock} onUnlock={() => {}} />);
    expect(screen.getByRole("img", { name: /Warning: Front door: jammed/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Lock again/ }));
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it("presses nothing while it turns, and says Unavailable while unavailable", () => {
    const onLock = vi.fn();
    const { rerender } = render(<LockCard entity={{ ...unlocked, state: "locking" }} onLock={onLock} onUnlock={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Front door: Locking…" }));
    expect(onLock).not.toHaveBeenCalled();
    rerender(<LockCard entity={{ ...locked, state: "unavailable", lastSeen: "08:20" }} onLock={onLock} onUnlock={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Front door: Unavailable" }));
    expect(onLock).not.toHaveBeenCalled();
    expect(screen.getByText("Last seen 08:20")).toBeTruthy();
  });

  it("keeps one state cue in the compact row", () => {
    const { container } = render(<LockCard entity={unlocked} footprint="compact" onLock={() => {}} onUnlock={() => {}} />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Unlocked");
  });
});

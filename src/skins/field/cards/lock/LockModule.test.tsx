import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LockModule } from "./LockModule";
import { LOCK_SEEDS, LOCK_WORST_CASE } from "@dashhaus/core/seeds/lock";
import { SETTLE_MS } from "@dashhaus/core/hooks";
import type { LockEntity } from "@dashhaus/core/entities/lock/types";

const draw = (entity: LockEntity, props: Partial<Parameters<typeof LockModule>[0]> = {}) => {
  const handlers = { onLock: vi.fn(async () => "done" as const), onUnlock: vi.fn(async () => "done" as const), onOpenDoor: vi.fn(async () => "done" as const) };
  const view = render(<LockModule entity={entity} {...handlers} {...props} />);
  return { ...view, ...handlers, keys: () => [...view.container.querySelectorAll<HTMLButtonElement>(".fd-module .fd-key")] };
};

afterEach(() => { vi.useRealTimers(); });

describe("LockModule", () => {
  it("locks an unlocked lock on a press, its key saying Lock and its LED dark", () => {
    const { keys, onLock, container } = draw(LOCK_SEEDS.unlocked.entity);
    const [key] = keys();
    expect(key.getAttribute("aria-label")).toBe("Lock Back door");
    expect(key.querySelector(".fd-led")?.getAttribute("data-lit")).toBe("false");
    fireEvent.click(key);
    expect(onLock).toHaveBeenCalledTimes(1);
    expect(container.querySelector(".fd-read-fig")?.textContent).toContain("OPEN");
  });

  it("never unlocks on a press: the panel opens on the question, Cancel focused, Unlock waiting a moment", async () => {
    vi.useFakeTimers();
    const { keys, onUnlock } = draw(LOCK_SEEDS.locked.entity);
    const [key] = keys();
    expect(key.querySelector(".fd-led")?.getAttribute("data-lit")).toBe("true");
    fireEvent.click(key);
    expect(onUnlock).not.toHaveBeenCalled();
    expect(screen.getByText("Unlock Front door?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Unlock, Front door", hidden: true }));
    expect(onUnlock).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(SETTLE_MS); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Unlock, Front door", hidden: true })); });
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it("takes the code on its keypad when the lock asks for one", async () => {
    const onUnlock = vi.fn(async (code?: string) => (code === "1234" ? "done" as const : "wrong_code" as const));
    draw(LOCK_SEEDS.code.entity, { onUnlock, defaultAction: "unlock" });
    for (const d of ["1", "2", "3", "4"]) fireEvent.click(screen.getByRole("button", { name: d, hidden: true }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Enter code", hidden: true })); });
    expect(onUnlock).toHaveBeenCalledWith("1234");
  });

  it("offers Open door in the panel only where the lock can", () => {
    draw(LOCK_SEEDS.locked.entity, { defaultOpen: true });
    expect(screen.getByRole("button", { name: "Open Front door: asks first", hidden: true })).toBeTruthy();
  });

  it("is urgent while jammed, and its key locks again", () => {
    const { container, keys, onLock } = draw(LOCK_SEEDS.jammed.entity);
    expect(container.querySelector(".fd-warn[data-block]")?.textContent).toContain("Jammed");
    fireEvent.click(keys()[0]);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it("prints a low battery on the plate in place of the area", () => {
    const { container } = draw(LOCK_SEEDS.code.entity);
    expect(container.querySelector(".fd-module .fd-area")?.textContent).toContain("Battery 12%");
  });

  it("blanks the screen while unavailable and lays its key flat, still focusable", () => {
    const { container, keys, onLock } = draw(LOCK_SEEDS.unavailable.entity);
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    const [key] = keys();
    expect(key.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(key);
    expect(onLock).not.toHaveBeenCalled();
  });

  it("keeps its height's anatomy with the worst-case data", () => {
    for (const seed of LOCK_WORST_CASE) {
      const { container, unmount } = draw(seed.entity, { footprint: "compact" });
      expect(container.querySelector(".fd-module")?.getAttribute("data-footprint")).toBe("compact");
      unmount();
    }
  });
});

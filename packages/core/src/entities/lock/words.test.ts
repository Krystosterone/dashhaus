import { describe, expect, it } from "vitest";
import { LOCK_WAITING, lockAskAction, lockAskDetail, lockAsksHint, lockCodeFor, lockQuestion } from "./words";

describe("a lock's guard in words", () => {
  it("asks, says what yes means and names its yes", () => {
    expect(lockQuestion("unlock", "Front door")).toBe("Unlock Front door?");
    expect(lockQuestion("open", "Front door")).toBe("Open Front door?");
    expect(lockAskDetail("open", "Front door")).toBe("Front door unlatches, and the door can be pushed open.");
    expect(lockAskDetail("unlock", "Front door")).toBe("Anyone at the door can open it.");
    expect(lockAskAction("open")).toBe("Open door");
    expect(LOCK_WAITING).toBe("Waiting for the lock");
  });

  it("says what asks first while no question stands, or nothing", () => {
    expect(lockAsksHint(true, false)).toBe("Unlocking asks first.");
    expect(lockAsksHint(true, true)).toBe("Unlocking and opening the door ask first.");
    expect(lockAsksHint(false, true)).toBe("Opening the door asks first.");
    expect(lockAsksHint(false, false)).toBeUndefined();
  });

  it("says what a keypad's code is for, after the skin's frame", () => {
    expect(lockCodeFor("lock")).toBe("lock");
    expect(lockCodeFor("unlock")).toBe("unlock");
    expect(lockCodeFor("open")).toBe("open the door");
  });
});

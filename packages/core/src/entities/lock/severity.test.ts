import { describe, expect, it } from "vitest";
import { lockSeverity } from "./severity";
import type { LockEntity } from "./types";

const e: LockEntity = { entityId: "lock.front", name: "Front", state: "locked", supportsOpen: false };

describe("lockSeverity", () => {
  it("ranks a jam urgent, a low battery advisory, and unlocked as no warning", () => {
    expect(lockSeverity({ ...e, state: "jammed", battery: 5 })).toBe("urgent");
    expect(lockSeverity({ ...e, battery: 15 })).toBe("advisory");
    expect(lockSeverity({ ...e, battery: 16 })).toBeUndefined();
    expect(lockSeverity({ ...e, state: "unlocked" })).toBeUndefined();
    expect(lockSeverity({ ...e, state: "unavailable", battery: 2 })).toBeUndefined();
  });
});

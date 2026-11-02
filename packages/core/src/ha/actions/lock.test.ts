import { describe, expect, it, vi } from "vitest";
import { createLockHandlers } from "./lock";
import { HaActionError } from "../types";
import type { LockEntity } from "../../entities/lock/types";

const entity: LockEntity = { entityId: "lock.front_door", name: "Front door", state: "locked", supportsOpen: true, codeFormat: null };
const coded: LockEntity = { ...entity, codeFormat: "number", codePattern: "^\\d{4}$" };

describe("createLockHandlers", () => {
  it("calls lock.lock, lock.unlock and lock.open, with the code when there is one", async () => {
    const callService = vi.fn(async () => undefined);
    const handlers = createLockHandlers({ callService }, coded);
    await expect(handlers.onLock()).resolves.toBe("done");
    await expect(handlers.onUnlock("1234")).resolves.toBe("done");
    await expect(handlers.onOpen("1234")).resolves.toBe("done");
    expect(callService.mock.calls).toEqual([
      ["lock", "lock", { entity_id: "lock.front_door" }],
      ["lock", "unlock", { entity_id: "lock.front_door", code: "1234" }],
      ["lock", "open", { entity_id: "lock.front_door", code: "1234" }],
    ]);
  });

  it("never calls toggle", async () => {
    const callService = vi.fn(async () => undefined);
    const handlers = createLockHandlers({ callService }, entity);
    await handlers.onLock();
    await handlers.onUnlock();
    expect(callService.mock.calls.map((call) => (call as unknown[])[1])).not.toContain("toggle");
  });

  it("answers wrong_code, unsent, for a code that can't fit the pattern", async () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    await expect(createLockHandlers({ callService }, coded, { onError }).onUnlock("12")).resolves.toBe("wrong_code");
    expect(callService).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("answers wrong_code when Home Assistant refuses the code, without reporting it as an error", async () => {
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw new HaActionError("service_failed", "bad code", { translationKey: "add_default_code" }); });
    await expect(createLockHandlers({ callService }, coded, { onError }).onUnlock("9999")).resolves.toBe("wrong_code");
    expect(onError).not.toHaveBeenCalled();
  });

  it("answers failed and reports a call that didn't go through, never rejecting", async () => {
    const onError = vi.fn();
    const callService = vi.fn(async () => { throw new Error("socket closed"); });
    await expect(createLockHandlers({ callService }, entity, { onError }).onUnlock()).resolves.toBe("failed");
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed", domain: "lock", service: "unlock", entityId: "lock.front_door" }));
  });

  it("sends nothing while unavailable, and reports it", async () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    const handlers = createLockHandlers({ callService }, { ...entity, state: "unavailable" }, { onError });
    await expect(handlers.onLock()).resolves.toBe("failed");
    await expect(handlers.onUnlock()).resolves.toBe("failed");
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported", domain: "lock" }));
  });

  it("refuses to open a lock that can't", async () => {
    const callService = vi.fn(async () => undefined);
    const onError = vi.fn();
    await expect(createLockHandlers({ callService }, { ...entity, supportsOpen: false }, { onError }).onOpen()).resolves.toBe("failed");
    expect(callService).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "unsupported" }));
  });
});

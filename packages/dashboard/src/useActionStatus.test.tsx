import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { HaProvider, createHaStore } from "@dashhaus/core";
import type { HassEntities } from "@dashhaus/core";
import { useActionStatus } from "./useActionStatus";

const entities: HassEntities = {
  "switch.fan": { entity_id: "switch.fan", state: "off", attributes: { friendly_name: "Desk fan" } },
};

function setup(callService: () => Promise<unknown>) {
  const store = createHaStore({
    subscribeEntities(listener) { queueMicrotask(() => listener(entities)); return () => undefined; },
    callService,
  });
  const wrapper = ({ children }: { children: ReactNode }) => <HaProvider store={store}>{children}</HaProvider>;
  return { store, ...renderHook(() => useActionStatus(), { wrapper }) };
}

describe("useActionStatus", () => {
  it("is null until a command is rejected, then names the device and retries it", async () => {
    let fail = true;
    const callService = vi.fn(async () => { if (fail) throw new Error("rejected"); return undefined; });
    const { store, result } = setup(callService);
    await waitFor(() => expect(store.getSnapshot().status).toBe("connected"));
    expect(result.current).toBeNull();

    await act(async () => { await store.callService("switch", "toggle", { entity_id: "switch.fan" }).catch(() => undefined); });
    expect(result.current).toMatchObject({ title: "Desk fan didn’t respond", canRetry: true, retrying: false });

    fail = false;
    act(() => result.current!.retry());
    expect(result.current?.retrying).toBe(true);
    await waitFor(() => expect(result.current).toBeNull());
    expect(callService).toHaveBeenCalledTimes(2);
  });

  it("dismisses the status until the next rejection", async () => {
    const { store, result } = setup(async () => { throw new Error("rejected"); });
    await waitFor(() => expect(store.getSnapshot().status).toBe("connected"));
    await act(async () => { await store.callService("switch", "toggle", { entity_id: "switch.fan" }).catch(() => undefined); });
    expect(result.current).not.toBeNull();
    act(() => result.current!.dismiss());
    expect(result.current).toBeNull();
  });
});

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaProvider } from "@scope/core";
import { createHaStore } from "@scope/core";
import type { HassEntities } from "@scope/core";
import { ActionStatus } from "./ActionStatus";

const entities: HassEntities = {
  "light.kitchen": {
    entity_id: "light.kitchen",
    state: "on",
    attributes: { friendly_name: "Kitchen light", supported_color_modes: ["onoff"] },
  },
};

describe("ActionStatus", () => {
  it("names a rejected action and retries it from one dashboard-level surface", async () => {
    let fail = true;
    const callService = vi.fn(async () => {
      if (fail) throw new Error("rejected");
      return { ok: true };
    });
    const store = createHaStore({
      subscribeEntities(listener) { queueMicrotask(() => listener(entities)); return () => undefined; },
      callService,
    });
    render(<HaProvider store={store}><ActionStatus /></HaProvider>);
    await waitFor(() => expect(store.getSnapshot().status).toBe("connected"));

    await act(async () => {
      await store.callService("light", "toggle", { entity_id: "light.kitchen" }).catch(() => undefined);
    });

    expect(screen.getByRole("alert").textContent).toContain("Kitchen light didn’t respond");
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(callService).toHaveBeenCalledTimes(2);
  });
});

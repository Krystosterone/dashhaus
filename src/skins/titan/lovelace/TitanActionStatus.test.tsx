import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaProvider, createHaStore } from "@dashhaus/core";
import type { HassEntities } from "@dashhaus/core";
import { TitanDashboard } from "./TitanDashboard";

const entities: HassEntities = {
  "light.kitchen": { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen light" } },
};

describe("Titan rejected commands", () => {
  it("shows a rejected command on the Dashboard, retries it and clears", async () => {
    let fail = true;
    const callService = vi.fn(async () => { if (fail) throw new Error("rejected"); return undefined; });
    const store = createHaStore({ subscribeEntities(listener) { queueMicrotask(() => listener(entities)); return () => undefined; }, callService });
    render(<HaProvider store={store}><TitanDashboard title="Home" rows={[]} footprint="standard" /></HaProvider>);
    await waitFor(() => expect(store.getSnapshot().status).toBe("connected"));
    expect(screen.queryByRole("alert")).toBeNull();

    await act(async () => { await store.callService("light", "toggle", { entity_id: "light.kitchen" }).catch(() => undefined); });
    expect(screen.getByRole("alert", { name: "Home Assistant action failed" }).textContent).toContain("Kitchen light didn’t respond");

    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(callService).toHaveBeenCalledTimes(2);
  });
});

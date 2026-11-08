import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { HaProvider } from "../provider";
import { createHaStore } from "../store";
import type { HassEntities } from "../types";
import { fakeTransport } from "../../testing";
import { HourCycleProvider } from "../../hooks/hourCycle";
import { useHaLock } from "./lock";

/** Every useHa<Name> hook says its times on the dashboard's hour cycle (`useHourCycle`); the lock's stands for them all. */
describe("a useHa<Name> hook under a dashboard's hour cycle", () => {
  const raw: HassEntities = {
    "lock.front_door": {
      entity_id: "lock.front_door",
      state: "locked",
      attributes: { friendly_name: "Front door" },
      last_changed: new Date(new Date().setHours(0, 5, 0, 0)).toISOString(),
      last_updated: new Date(new Date().setHours(0, 5, 0, 0)).toISOString(),
    },
  };

  it.each([["h23", "00:05"], ["h12", "12:05\u00a0AM"]] as const)("formats its times on %s", async (cycle, said) => {
    const store = createHaStore(fakeTransport(raw).transport);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <HaProvider store={store}><HourCycleProvider hourCycle={cycle}>{children}</HourCycleProvider></HaProvider>
    );
    const { result } = renderHook(() => useHaLock("lock.front_door"), { wrapper });
    await waitFor(() => expect(result.current.entity.lastChanged).toBe(said));
  });
});

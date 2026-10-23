import { describe, expect, it, vi } from "vitest";
import { createDemoOwletHaTransport } from "./owlet";
import type { HassEntities } from "../types";

const BASE = "sensor.owlet_sock_ac000w0123";

describe("createDemoOwletHaTransport", () => {
  it("publishes one sock's sleep state, heart rate and oxygen", async () => {
    const transport = createDemoOwletHaTransport(undefined, 0);
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(latest).toMatchObject({
      [`${BASE}_sleep_state`]: { state: "deep_sleep" },
      [`${BASE}_heart_rate`]: { state: "121" },
      [`${BASE}_o2_saturation`]: { state: "98" },
    });
  });

  it("sends a new heart rate every tick, like the integration's polling, and stops when unsubscribed", async () => {
    vi.useFakeTimers();
    try {
      const transport = createDemoOwletHaTransport(undefined, 5000);
      const updates: HassEntities[] = [];
      const unsubscribe = transport.subscribeEntities((entities) => updates.push(entities));
      await vi.advanceTimersByTimeAsync(10_000);
      const rates = updates.map((e) => e[`${BASE}_heart_rate`]);
      expect(updates.length).toBe(3);
      expect(new Set(rates.map((r) => r.last_updated)).size).toBeGreaterThan(1);
      for (const r of rates) expect(Number(r.state)).toBeGreaterThanOrEqual(112);
      unsubscribe();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(updates.length).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses every service: the sock is read-only", async () => {
    await expect(createDemoOwletHaTransport().callService("sensor", "toggle", { entity_id: `${BASE}_sleep_state` })).rejects.toThrow(/read-only/);
  });

  it("answers today's night for each sensor and the registries", async () => {
    const transport = createDemoOwletHaTransport();
    const history = await transport.sendMessage?.("history/history_during_period", { entity_ids: [`${BASE}_sleep_state`, `${BASE}_heart_rate`] }) as Record<string, Array<{ s: string }>>;
    expect(Object.keys(history)).toEqual([`${BASE}_sleep_state`, `${BASE}_heart_rate`]);
    expect(history[`${BASE}_sleep_state`].map((row) => row.s)).toContain("light_sleep");
    const registry = await transport.sendMessage?.("config/entity_registry/list_for_display") as { entities: unknown[] };
    expect(registry.entities).toContainEqual(expect.objectContaining({ ei: `${BASE}_sleep_state` }));
  });
});

import { describe, expect, it } from "vitest";
import { createDemoSunHaTransport, demoSun } from "./sun";
import { sunFromHass } from "../ha/mappers/sun";
import type { HassEntities } from "../ha/types";

const noon = new Date(2026, 9, 19, 12, 0).getTime();
const night = new Date(2026, 9, 19, 23, 0).getTime();

describe("createDemoSunHaTransport", () => {
  it("publishes the sun where it is, with every time Home Assistant reports", async () => {
    const transport = createDemoSunHaTransport(noon);
    let latest: HassEntities | undefined;
    transport.subscribeEntities((entities) => { latest = entities; });
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(latest?.["sun.sun"]).toMatchObject({ state: "above_horizon" });
    const sun = sunFromHass(latest?.["sun.sun"], "sun.sun", { now: new Date(noon) });
    expect(sun).toMatchObject({ state: "ok", up: true });
    for (const at of [sun.nextDawn, sun.nextRising, sun.nextNoon, sun.nextSetting, sun.nextDusk]) expect(at).toBeGreaterThan(noon);
  });

  it("is down at night, and rises the next morning", () => {
    const sun = sunFromHass(demoSun(night), "sun.sun", { now: new Date(night) });
    expect(sun.up).toBe(false);
    expect(new Date(sun.nextRising!).getDate()).toBe(20);
    expect(sun.elevation).toBeLessThan(0);
  });

  it("refuses every service: the sun is read-only", async () => {
    await expect(createDemoSunHaTransport().callService("sun", "toggle", { entity_id: "sun.sun" })).rejects.toThrow(/read-only/);
  });

  it("answers the home's location, which the path is drawn from", async () => {
    const config = await createDemoSunHaTransport().sendMessage?.("get_config") as { latitude: number; longitude: number };
    expect(config.latitude).toBe(45.5);
    expect(Number.isFinite(config.longitude)).toBe(true);
  });
});

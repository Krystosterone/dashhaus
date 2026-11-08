import { describe, expect, it } from "vitest";
import { sunFromHass } from "./sun";
import fixture from "../fixtures/sun.json";

const now = new Date("2026-10-19T15:54:00Z");

describe("sunFromHass", () => {
  it("maps whether it is up, every time it reports and where it is", () => {
    const sun = sunFromHass(fixture["sun.sun"], "sun.sun", { now });
    expect(sun).toMatchObject({
      entityId: "sun.sun",
      name: "Sun",
      state: "ok",
      up: true,
      nextSetting: Date.parse("2026-10-19T22:07:44.507199+00:00"),
      nextRising: Date.parse("2026-10-20T11:23:40.902415+00:00"),
      nextDawn: Date.parse("2026-10-20T10:53:12.401243+00:00"),
      nextDusk: Date.parse("2026-10-19T22:38:05.118202+00:00"),
      nextNoon: Date.parse("2026-10-20T16:44:52+00:00"),
      elevation: 34.38,
      azimuth: 182.7,
      now: now.getTime(),
    });
    expect(sun.lastUpdated).toBeDefined();
  });

  it("says when it last updated on the dashboard's hour cycle", () => {
    expect(sunFromHass(fixture["sun.sun"], "sun.sun", { now, hourCycle: "h23" }).lastUpdated).toMatch(/^\d\d:\d\d$/);
    expect(sunFromHass(fixture["sun.sun"], "sun.sun", { now, hourCycle: "h12" }).lastUpdated).toMatch(/^\d{1,2}:\d\d\u00a0[AP]M$/);
  });

  it("is down below the horizon", () => {
    expect(sunFromHass(fixture["sun.sun_night"], "sun.sun_night", { now })).toMatchObject({ state: "ok", up: false, elevation: -37.14 });
  });

  it("keeps unknown, unavailable and missing entities unavailable, with nothing reported", () => {
    for (const id of ["sun.sun_unknown", "sun.sun_unavailable"] as const) {
      expect(sunFromHass(fixture[id], id, { now, lastSeen: "08:20" })).toMatchObject({ state: "unavailable", up: undefined, nextSetting: undefined, lastSeen: "08:20" });
    }
    expect(sunFromHass(undefined, "sun.sun")).toMatchObject({ name: "sun.sun", state: "unavailable" });
  });

  it("leaves out a time that doesn't parse and a position that isn't a number, never guessing one", () => {
    const raw = { ...fixture["sun.sun"], attributes: { ...fixture["sun.sun"].attributes, next_setting: "soon", elevation: "high" } };
    const sun = sunFromHass(raw, "sun.sun", { now });
    expect(sun.nextSetting).toBeUndefined();
    expect(sun.elevation).toBeUndefined();
  });

  it("doesn't know whether it is up from a state it doesn't name", () => {
    expect(sunFromHass({ ...fixture["sun.sun"], state: "eclipsed" }, "sun.sun", { now })).toMatchObject({ state: "ok", up: undefined });
  });
});

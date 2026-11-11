import { describe, expect, it } from "vitest";
import { SUN_PATH_STEPS, sunDay, sunElevation, sunEvents, sunPosition } from "./position";

// Greenwich at the June solstice and the March equinox, in UTC, so the expected values don't depend on the zone.
const june = Date.UTC(2026, 5, 21, 12, 2);
const march = Date.UTC(2026, 2, 20, 12, 7);

describe("sunPosition", () => {
  it("puts the summer sun at noon in the south, at 90° less the latitude plus the tilt", () => {
    const { elevation, azimuth } = sunPosition(june, 51.48, 0);
    expect(elevation).toBeCloseTo(90 - 51.48 + 23.44, 0);
    expect(azimuth).toBeGreaterThan(175);
    expect(azimuth).toBeLessThan(185);
  });

  it("puts the equinox sun overhead at the equator, and on the horizon at the pole", () => {
    expect(sunElevation(march, 0, 0)).toBeGreaterThan(89);
    expect(Math.abs(sunElevation(march, 90, 0))).toBeLessThan(1);
  });

  it("has it below the horizon at midnight", () => {
    expect(sunElevation(Date.UTC(2026, 5, 21, 0, 2), 51.48, 0)).toBeLessThan(0);
  });

  it("rises in the east and sets in the west", () => {
    expect(sunPosition(Date.UTC(2026, 2, 20, 6, 10), 0, 0).azimuth).toBeCloseTo(90, -1);
    expect(sunPosition(Date.UTC(2026, 2, 20, 18, 5), 0, 0).azimuth).toBeCloseTo(270, -1);
  });
});

describe("sunDay", () => {
  // Local time, so the day is the zone's; the longitude follows the zone, so noon falls near midday.
  const now = new Date(2026, 9, 19, 11, 54).getTime();
  const longitude = -new Date(now).getTimezoneOffset() / 4;
  const day = sunDay(now, 45.5, longitude);

  it("draws the day's path, rising before noon and setting after", () => {
    expect(day.path).toHaveLength(SUN_PATH_STEPS + 1);
    expect(day.riseAt).toBeGreaterThan(0.2);
    expect(day.riseAt).toBeLessThan(0.3);
    expect(day.setAt).toBeGreaterThan(0.68);
    expect(day.setAt).toBeLessThan(0.74);
    expect(day.peak).toBeCloseTo(34.4, 0);
    expect(day.nowAt).toBeCloseTo((11 * 60 + 54) / (24 * 60), 2);
    expect(day.currentHour).toBe(11);
  });

  it("gives each hour its height against the peak, and nothing while the sun is down", () => {
    expect(day.samples).toHaveLength(24);
    expect(day.samples[2]).toBe(0);
    expect(day.samples[22]).toBe(0);
    expect(Math.max(...(day.samples as number[]))).toBe(1);
  });

  it("counts the daylight between sunrise and sunset", () => {
    expect(day.daylightMinutes).toBeGreaterThan(10 * 60 + 30);
    expect(day.daylightMinutes).toBeLessThan(11 * 60);
  });

  it("is a whole day of daylight in a polar summer, and none in a polar winter", () => {
    const summer = sunDay(new Date(2026, 5, 21, 12).getTime(), 78.2, longitude);
    expect(summer.riseAt).toBeUndefined();
    expect(summer.daylightMinutes).toBe(24 * 60);
    const winter = sunDay(new Date(2026, 11, 21, 12).getTime(), 78.2, longitude);
    expect(winter.daylightMinutes).toBe(0);
    expect(winter.samples.every((x) => x === 0)).toBe(true);
  });
});

describe("sunDay on a DST day", () => {
  /** Run `test` with the clock in Toronto, whose DST days are 23 and 25 hours long. */
  const inToronto = <T>(test: () => T): T => {
    const previous = process.env.TZ;
    process.env.TZ = "America/Toronto";
    try {
      return test();
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  };

  /** Each clock hour's highest sun against the day's peak, minute by minute. */
  const clockHours = (year: number, month: number, date: number, latitude: number, longitude: number, peak: number) =>
    Array.from({ length: 24 }, (_, h) => {
      const from = new Date(year, month, date, h).getTime(), to = new Date(year, month, date, h + 1).getTime();
      let top = -90;
      for (let t = from; t <= to; t += 60_000) top = Math.max(top, sunElevation(t, latitude, longitude));
      return peak > 0 && top > 0 ? Math.min(1, top / peak) : 0;
    });

  for (const [name, date] of [["spring", 8], ["fall", 1]] as const) {
    const month = name === "spring" ? 2 : 10;
    it(`says the clock's hour and cuts the hours on the clock, in the ${name}`, () => {
      inToronto(() => {
        const day = sunDay(new Date(2026, month, date, 12, 0).getTime(), 43.65, -79.38);
        expect(day.currentHour).toBe(12);
        const expected = clockHours(2026, month, date, 43.65, -79.38, day.peak);
        day.samples.forEach((sample, h) => expect(sample as number).toBeCloseTo(expected[h], 1));
      });
    });
  }
});

describe("sunEvents", () => {
  const now = new Date(2026, 9, 19, 11, 54).getTime();
  const longitude = -new Date(now).getTimezoneOffset() / 4;

  it("gives the next of each event after now, in the order a day brings them", () => {
    const e = sunEvents(now, 45.5, longitude);
    expect(e.nextSetting).toBeGreaterThan(now);
    expect(e.nextDusk).toBeGreaterThan(e.nextSetting!);
    expect(e.nextDawn).toBeGreaterThan(e.nextDusk!);
    expect(e.nextRising).toBeGreaterThan(e.nextDawn!);
    expect(e.nextNoon).toBeGreaterThan(e.nextRising!);
    expect(e.nextRising! - e.nextDawn!).toBeLessThan(45 * 60_000);
  });

  it("leaves out a sunset that doesn't come within two days", () => {
    const e = sunEvents(new Date(2026, 5, 21, 12).getTime(), 78.2, longitude);
    expect(e.nextSetting).toBeUndefined();
    expect(e.nextRising).toBeUndefined();
    expect(e.nextNoon).toBeDefined();
  });
});

import { describe, expect, it } from "vitest";
import { NO_READINGS_TODAY, rangeSummary, shortTodaySummary, todaySummary } from "./today";

describe("rangeSummary", () => {
  it("says the day's low and high in the figures' own format, or that there are none yet", () => {
    expect(rangeSummary(18.2, 21, (t) => `${t}°`)).toBe("Low 18.2° · High 21°");
    expect(rangeSummary(null, 21, String)).toBe(NO_READINGS_TODAY);
    expect(NO_READINGS_TODAY).toBe("No readings yet");
  });
});

describe("todaySummary", () => {
  it("says how long it was in its state today", () => {
    expect(todaySummary("on", 156)).toBe("On 2h 36m");
    expect(todaySummary("armed", 60)).toBe("Armed 1h");
    expect(todaySummary("asleep", 42)).toBe("Asleep 42m");
    expect(todaySummary("heating", 95)).toBe("Heating 1h 35m");
  });

  it("says when it never was", () => {
    expect(todaySummary("on", 0)).toBe("Not on today");
    expect(todaySummary("armed", 0)).toBe("Not armed today");
    expect(todaySummary("asleep", -3)).toBe("Not asleep today");
    expect(todaySummary("cooling", 0)).toBe("Not cooling today");
  });
});

describe("shortTodaySummary", () => {
  it("leaves off a closing today, for a strip that is always today's", () => {
    expect(shortTodaySummary(todaySummary("detected", 0))).toBe("Not detected");
    expect(shortTodaySummary("+8.6 kWh today")).toBe("+8.6 kWh");
  });

  it("keeps a summary that doesn't end in today as it is", () => {
    expect(shortTodaySummary(todaySummary("on", 156))).toBe("On 2h 36m");
    expect(shortTodaySummary("Low 18.2° · High 21°")).toBe("Low 18.2° · High 21°");
    expect(shortTodaySummary("Busy today, then free")).toBe("Busy today, then free");
  });
});

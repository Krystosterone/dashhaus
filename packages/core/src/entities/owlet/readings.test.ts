import { describe, expect, it } from "vitest";
import { ALERT_SAID, ALERT_WORD, SLEEP_UNKNOWN, fmtBpm, fmtOxygen, normalize, rankAlerts, staleSaid, staleText } from "./readings";
import { owletSeverity } from "./severity";

describe("normalize", () => {
  it("scales readings between 0.12 and 1, keeping gaps and hours ahead", () => {
    const { samples, min, max } = normalize([120, 140, "unavailable", null]);
    expect(samples).toEqual([0.12, 1, "unavailable", null]);
    expect([min, max]).toEqual([120, 140]);
  });
  it("keeps a flat line off the baseline", () => {
    expect(normalize([98, 98]).samples).toEqual([0.12, 0.12]);
  });
  it("has no low or high before the first reading", () => {
    expect(normalize(["unavailable", null])).toEqual({ samples: ["unavailable", null], min: null, max: null });
  });
});

describe("formatting", () => {
  it("rounds to whole beats and whole percent", () => {
    expect(fmtBpm(127.6)).toBe("128");
    expect(fmtOxygen(97.4)).toBe("97");
  });
});

describe("rankAlerts", () => {
  it("splits vitals from device problems, most urgent first", () => {
    expect(rankAlerts(["low_battery", "low_heart_rate", "sock_off", "critical_oxygen"])).toEqual({
      vitals: ["critical_oxygen", "low_heart_rate"],
      problems: ["sock_off", "low_battery"],
    });
  });
  it("is empty without alerts", () => {
    expect(rankAlerts()).toEqual({ vitals: [], problems: [] });
  });
});

describe("owletSeverity", () => {
  it("makes a vitals alert the alarm, whatever else is sounding", () => {
    expect(owletSeverity(["low_battery", "low_oxygen"], true)).toBe("alarm");
  });
  it("makes a problem that stops the monitoring, or stopped readings, urgent", () => {
    expect(owletSeverity(["sock_off"])).toBe("urgent");
    expect(owletSeverity(["critical_battery", "low_battery"])).toBe("urgent");
    expect(owletSeverity([], true)).toBe("urgent");
  });
  it("leaves a low battery advisory, and a quiet sock at nothing", () => {
    expect(owletSeverity(["low_battery"])).toBe("advisory");
    expect(owletSeverity()).toBeUndefined();
  });
});

describe("owlet words", () => {
  it("has a short word for every alert, and says each in full aloud", () => {
    expect(Object.keys(ALERT_SAID).sort()).toEqual(Object.keys(ALERT_WORD).sort());
    expect(ALERT_SAID.critical_oxygen).toBe("Critical oxygen");
  });

  it("says readings that stopped in a row's room, the time without its day, and whole aloud", () => {
    expect(staleText("11:49")).toBe("Stopped 11:49");
    expect(staleText("Fri 18:30")).toBe("Stopped 18:30");
    expect(staleText()).toBe("Stopped");
    expect(staleSaid("Fri 18:30")).toBe("No new reading since Fri 18:30");
    expect(SLEEP_UNKNOWN).toBe("Sleep unknown");
  });
});

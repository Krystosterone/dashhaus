import { describe, expect, it } from "vitest";
import { clockFace } from "./clock";

const NOW = new Date(2026, 9, 17, 11, 54);

describe("clockFace", () => {
  it("pads a 24-hour clock's hour and has no day period", () => {
    const face = clockFace(new Date(2026, 8, 30, 9, 5), { locale: "de-DE" });
    expect(face).toMatchObject({ time: "09:05", period: undefined, twentyFour: true });
  });

  it("leaves a 12-hour clock's hour unpadded, its day period apart", () => {
    const face = clockFace(new Date(2026, 8, 30, 9, 5), { locale: "en-US", hourCycle: "h12" });
    expect(face.time).toBe("9:05");
    expect(face.period).toBe("AM");
    expect(face.twentyFour).toBe(false);
  });

  it("follows an asked-for hour cycle over the locale's", () => {
    expect(clockFace(NOW, { locale: "en-US", hourCycle: "h23" }).time).toBe("11:54");
  });

  it("says the date in words, and the day machine-readable", () => {
    const face = clockFace(NOW, { locale: "en-CA" });
    expect(face.date).toBe("Saturday, October 17");
    expect(face.day).toBe("2026-10-17");
  });

  it("reads the day in the clock's time zone, not UTC's", () => {
    const late = new Date(Date.UTC(2026, 9, 18, 3, 30));
    expect(clockFace(late, { locale: "en-CA", timeZone: "America/Vancouver" }).day).toBe("2026-10-17");
    expect(clockFace(late, { locale: "en-CA", timeZone: "Europe/Paris" }).day).toBe("2026-10-18");
  });
});

import { describe, expect, it } from "vitest";
import { sunPathDrawing } from "./drawing";
import { sunDay } from "./position";

const longitude = (ms: number) => -new Date(ms).getTimezoneOffset() / 4;
const day = (ms: number, latitude = 45.5) => sunDay(ms, latitude, longitude(ms));

describe("sunPathDrawing", () => {
  it("cuts the day into night, the day so far, the day to come and night again", () => {
    const morning = new Date(2026, 9, 19, 11, 54).getTime();
    const drawing = sunPathDrawing(day(morning));
    expect(drawing.pieces.map((p) => p.part)).toEqual(["night", "past", "ahead", "night"]);
    expect(drawing.up).toBe(true);
    // The sun is above the horizon (nearer the top), and every point is inside the drawing.
    expect(drawing.sun[1]).toBeLessThan(drawing.horizon);
    for (const { points } of drawing.pieces) for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(1);
    }
  });

  it("joins its pieces end to end, from midnight to midnight", () => {
    const drawing = sunPathDrawing(day(new Date(2026, 9, 19, 11, 54).getTime()));
    expect(drawing.pieces[0].points[0][0]).toBe(0);
    expect(drawing.pieces.at(-1)!.points.at(-1)![0]).toBe(1);
    for (let i = 1; i < drawing.pieces.length; i++) expect(drawing.pieces[i].points[0]).toEqual(drawing.pieces[i - 1].points.at(-1));
  });

  it("has nothing past by day after sunset: the evening is all night after the day", () => {
    const drawing = sunPathDrawing(day(new Date(2026, 9, 19, 20, 40).getTime()));
    expect(drawing.pieces.map((p) => p.part)).toEqual(["night", "past", "night"]);
    expect(drawing.up).toBe(false);
    expect(drawing.sun[1]).toBeGreaterThan(drawing.horizon);
  });

  it("is one piece of night in a polar winter", () => {
    const drawing = sunPathDrawing(day(new Date(2026, 11, 21, 11, 54).getTime(), 78.2));
    expect(drawing.pieces.map((p) => p.part)).toEqual(["night"]);
  });
});

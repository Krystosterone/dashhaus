import { describe, expect, it } from "vitest";
import { DashboardConfigError } from "@dashhaus/dashboard";
import { parseLcarsConfig } from "./config";

const problems = (raw: unknown) => {
  try { parseLcarsConfig(raw); return []; }
  catch (error) { if (error instanceof DashboardConfigError) return error.problems; throw error; }
};

describe("parseLcarsConfig", () => {
  it("accepts the empty automatic Dashboard and page furniture", () => {
    expect(parseLcarsConfig({ title: "Home", show_time: true, footprint: "compact" })).toMatchObject({ title: "Home", showTime: true, footprint: "compact" });
  });

  it("collects malformed layout values", () => {
    expect(problems({ cards: [], footprint: "large", show_time: "yes" })).toEqual([
      'cards must be a list of at least one item',
      '"show_time" must be true or false',
      '"footprint" must be one of "standard", "compact"',
    ]);
  });
});

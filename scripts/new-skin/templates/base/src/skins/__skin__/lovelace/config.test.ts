import { describe, expect, it } from "vitest";
import { DashboardConfigError } from "../../../ha/lovelace/yaml";
import { parse__Skin__Config } from "./config";

const problems = (raw: unknown) => {
  try { parse__Skin__Config(raw); return []; }
  catch (error) { if (error instanceof DashboardConfigError) return error.problems; throw error; }
};

describe("parse__Skin__Config", () => {
  it("accepts the empty automatic Dashboard and page furniture", () => {
    expect(parse__Skin__Config({ title: "Home", show_time: true, footprint: "compact" })).toMatchObject({ title: "Home", showTime: true, footprint: "compact" });
  });

  it("collects malformed layout values", () => {
    expect(problems({ cards: [], footprint: "large", show_time: "yes" })).toEqual([
      'cards must be a list of at least one item',
      '"show_time" must be true or false',
      '"footprint" must be one of "standard", "compact"',
    ]);
  });
});

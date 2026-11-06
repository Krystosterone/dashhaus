import { describe, expect, it } from "vitest";
import { DashboardConfigError } from "@dashhaus/core/lovelace";
import { parseFuturaConfig } from "./config";

const problems = (raw: unknown) => {
  try { parseFuturaConfig(raw); return []; }
  catch (error) { if (error instanceof DashboardConfigError) return error.problems; throw error; }
};

describe("parseFuturaConfig", () => {
  it("accepts the empty automatic Dashboard and page furniture", () => {
    expect(parseFuturaConfig({ title: "Home", show_time: true, footprint: "compact" })).toMatchObject({ title: "Home", showTime: true, footprint: "compact" });
  });

  it("collects malformed layout values", () => {
    expect(problems({ cards: [], footprint: "large", show_time: "yes" })).toEqual([
      '"footprint" must be one of "standard", "compact"',
      'cards: must be a list of at least one Card: entity ids like light.kitchen, or maps with an "entity" — each on its own line starting with "- "',
      '"show_time" must be true or false',
    ]);
  });

  it("reads rows of the shared layout, one footprint per row", () => {
    expect(problems({ rows: [{ title: "A", columns: 5, cards: [] }, { sections: [] }] })).toEqual([
      'rows[0]: "columns" must be a whole number from 1 to 4, or auto',
      'rows[0]: "cards" must be a list of at least one Card',
      'rows[1]: rows don\'t nest: list this row\'s cards under its own "cards", and put the inner sections beside it in the page\'s "rows"',
      'rows[1]: "cards" must be a list of at least one Card',
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { DashboardConfigError } from "@dashhaus/dashboard";
import { mapRowItems, rowItems } from "@dashhaus/dashboard/schema";
import { parseFieldConfig } from "./config";

const problems = (raw: unknown) => {
  try {
    parseFieldConfig(raw);
    return [];
  } catch (error) {
    if (error instanceof DashboardConfigError) return error.problems;
    throw error;
  }
};

describe("parseFieldConfig: the page", () => {
  it("takes a subtitle and a viewing distance, near by default", () => {
    expect(parseFieldConfig({ title: "Home", subtitle: "Night · quiet", viewing: "far" })).toMatchObject({ title: "Home", subtitle: "Night · quiet", viewing: "far" });
    expect(parseFieldConfig({}).viewing).toBeUndefined();
    expect(problems({ viewing: "distant" })).toEqual(['"viewing" must be one of "near", "far"']);
  });

  it("says why a main-card key isn't field's, rather than guessing at a typo", () => {
    expect(problems({ theme: "dark", accent: "sage" })).toEqual([
      '"theme" is the main card\'s: field\'s finish is "finish": home-assistant, auto, alloy or black',
      '"accent" is the main card\'s: field has no accent: colour names a parameter (spec/field.md)',
    ]);
  });
});

/** The modules of the main page, in order. */
const modulesOf = (raw: Record<string, unknown>) => rowItems(parseFieldConfig(raw).rows ?? []);

describe("parseFieldConfig: a module's keys", () => {
  it("takes history on any module, and unit on a climate entity or a sensor", () => {
    expect(modulesOf({
      cards: [
        { entity: "climate.hall", unit: "°F", history: false },
        { entity: "sensor.bed_temperature", unit: "°C" },
        "light.lamp",
      ],
    })).toEqual([
      expect.objectContaining({ entity: "climate.hall", kind: "climate", unit: "°F", history: false }),
      expect.objectContaining({ entity: "sensor.bed_temperature", kind: "sensor", unit: "°C" }),
      expect.objectContaining({ entity: "light.lamp", kind: "light" }),
    ]);
  });

  it("names each mistake: a unit on a light, a width past four, a history that isn't true or false", () => {
    expect(problems({ cards: [{ entity: "light.lamp", unit: "°C" }, { entity: "light.desk", width: 5 }, { entity: "climate.hall", history: "no", unit: "K" }] })).toEqual([
      'cards[0] (light.lamp): unknown key "unit"',
      'cards[1] (light.desk): "width" is how many columns the module spans: a whole number from 1 to 4, or full',
      'cards[2] (climate.hall): "history" must be true or false',
      'cards[2] (climate.hall): "unit" must be one of "°C", "°F" — did you mean "°C"?',
    ]);
  });

  it("says why show_control and a bundle are the main card's", () => {
    expect(problems({ cards: [{ entity: "light.lamp", show_control: true }, { bundle: "joined", cards: ["light.a", "light.b"] }] })).toEqual([
      'cards[0] (light.lamp): "show_control" is the main card\'s: a field row shows its screen in place of a control',
      "cards[1]: bundles are the main card's: list each module on its own",
    ]);
  });
});

describe("parseFieldConfig: the layout", () => {
  it("reads plain cards as one row, and titled rows with their own columns, widths and anchors", () => {
    const config = parseFieldConfig({
      rows: [
        { title: "Quick", note: "Pressed most", columns: 2, cards: ["light.a", { entity: "input_boolean.dnd", width: 2 }] },
        { title: "Living room", columns: 3, flow: "dense", align: "bottom", cards: [{ entity: "light.b", column: 3 }, "weather.home"] },
      ],
    });
    expect(config.rows).toEqual([
      { title: "Quick", note: "Pressed most", columns: 2, flow: "normal", align: "top", cards: [
        { item: expect.objectContaining({ entity: "light.a" }), width: 1, column: undefined },
        { item: expect.objectContaining({ entity: "input_boolean.dnd" }), width: 2, column: undefined },
      ] },
      { title: "Living room", note: undefined, columns: 3, flow: "dense", align: "bottom", cards: [
        { item: expect.objectContaining({ entity: "light.b" }), width: 1, column: 3 },
        { item: expect.objectContaining({ entity: "weather.home" }), width: 1, column: undefined },
      ] },
    ]);
  });

  it("mixes footprints by column: a row of them stacks each module in its column", () => {
    const config = parseFieldConfig({ rows: [{ title: "Living room", columns: 2, cards: [
      { entity: "light.living_room", column: 1 },
      { entity: "cover.living_room", column: 1, footprint: "compact" },
      { entity: "climate.living_room", column: 2 },
      { entity: "input_boolean.dnd", column: 2, footprint: "compact" },
    ] }] });
    expect(config.rows?.[0].stacks).toBe(true);
    // Against the page's own footprint: a compact page with one standard module mixes too.
    expect(problems({ footprint: "compact", cards: ["light.a", { entity: "light.b", footprint: "standard" }] })).toEqual([
      'cards[0] (light.a): this row mixes compact and standard modules, so each stacks in a column: give it a "column", or move the standard ones into a row of their own',
      'cards[1] (light.b): this row mixes compact and standard modules, so each stacks in a column: give it a "column", or move the standard ones into a row of their own',
    ]);
  });

  it("fills in every module of every row", () => {
    const { rows } = parseFieldConfig({ rows: [{ title: "A", cards: ["light.a"] }, { title: "B", cards: ["light.b"] }] });
    const placed = mapRowItems(rows!, (m) => ({ ...m, area: `Area of ${m.entity}` }));
    expect(rowItems(placed).map((m) => m.area)).toEqual(["Area of light.a", "Area of light.b"]);
  });

  it("names each mistake with its path and the fix", () => {
    expect(problems({
      modules: ["light.a"],
      rows: [
        { title: "Quick", modules: ["light.a"], cards: ["light.a"] },
        { title: "Gaps", gap: 4, columns: 6, cards: ["light.b"] },
        { rows: [] },
        "light.c",
        { title: "Living", cards: [{ entity: "light.d", footprnt: "compact" }] },
      ],
    })).toEqual([
      'modules: isn\'t a key: list the page\'s modules under "cards", or under "rows" in titled groups',
      'rows[0]: a row lists its modules under "cards"',
      'rows[1]: the skin spaces its grid: leave out "gap"',
      'rows[1]: "columns" must be a whole number from 1 to 4, or auto',
      'rows[2]: rows don\'t nest: list this row\'s cards under its own "cards", and put the inner rows beside it in the page\'s "rows"',
      'rows[2]: "cards" must be a list of at least one module',
      'rows[3] (light.c): this is a module, not a row: put it in a row\'s "cards", or list the modules under "cards" at the top for one plain grid',
      'rows[4].cards[0] (light.d): unknown key "footprnt" — did you mean "footprint"?',
    ]);
  });
});

describe("parseFieldConfig: nav and pages", () => {
  it("reads pages and a nav of titled rows, pages and other dashboards", () => {
    const config = parseFieldConfig({
      rows: [{ title: "Quick", cards: ["light.a"] }],
      pages: [{ id: "nursery", title: "Nursery", rows: [{ title: "Baby", cards: ["sensor.owlet_sock_ac000w0123_sleep_state"] }] }],
      nav: [{ page: "home" }, { section: "Quick", label: "Now" }, { page: "nursery" }, { navigate: "/baby-view/0", label: "Baby view" }],
    });
    expect(config.pages).toEqual([{ id: "nursery", title: "Nursery", rows: [expect.objectContaining({ title: "Baby", cards: [expect.objectContaining({ item: expect.objectContaining({ kind: "owlet" }) })] })] }]);
    expect(config.nav).toEqual([
      { kind: "page", id: "home", label: undefined },
      { kind: "section", title: "Quick", label: "Now" },
      { kind: "page", id: "nursery", label: undefined },
      { kind: "navigate", path: "/baby-view/0", label: "Baby view" },
    ]);
  });

  it("takes nav: false for no nav, and leaves both out by default", () => {
    expect(parseFieldConfig({ nav: false }).nav).toBe(false);
    expect(parseFieldConfig({})).toMatchObject({ nav: undefined, pages: undefined });
  });

  it("names every nav and page mistake, with the probable fix", () => {
    expect(problems({
      rows: [{ title: "Living room", cards: ["light.a"] }],
      pages: [{ id: "home", title: "Home", cards: ["light.b"] }, { title: "Nursery", rows: [] }],
      nav: [{ section: "living room" }, { page: "nursry" }, { navigate: "baby-view" }],
    })).toEqual([
      'pages[0]: "id" can\'t be "home": that is the main page',
      'pages[1]: "id" is required: lower-case letters, digits, - and _, like living-room',
      'pages[1].rows: must be a list of at least one row, each a map with its own "cards" — each row on its own line starting with "- "',
      'nav[2]: "navigate" is a Home Assistant path like /baby-view/0',
      'nav[0]: no row titled "living room" on the main page — did you mean "Living room"?',
      'nav[1]: no page "nursry" (pages: "home")',
    ]);
  });

  it("can't check a row named by area: the registries name those", () => {
    expect(problems({ nav: [{ section: "Kitchen" }] })).toEqual([]);
  });
});

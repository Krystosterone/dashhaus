import { describe, expect, it } from "vitest";
import { DashboardConfigError } from "@scope/dashboard";
import { mapModules, modulesOf, parseFieldConfig } from "./config";

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
      '"accent" is the main card\'s: field has no accent: colour names a parameter (docs/field.md)',
    ]);
  });
});

describe("parseFieldConfig: a module's keys", () => {
  it("takes span and history on any module, and unit on a climate entity or a sensor", () => {
    const { modules } = parseFieldConfig({
      modules: [
        { entity: "climate.hall", unit: "°F", history: false },
        { entity: "sensor.bed_temperature", unit: "°C", span: 2 },
        { entity: "light.lamp", span: 4 },
      ],
    });
    expect(modules).toEqual([
      expect.objectContaining({ entity: "climate.hall", kind: "climate", unit: "°F", history: false }),
      expect.objectContaining({ entity: "sensor.bed_temperature", kind: "sensor", unit: "°C", span: 2 }),
      expect.objectContaining({ entity: "light.lamp", kind: "light", span: 4 }),
    ]);
  });

  it("names each mistake: a unit on a light, a span past four, a history that isn't true or false", () => {
    expect(problems({ modules: [{ entity: "light.lamp", unit: "°C" }, { entity: "light.desk", span: 5 }, { entity: "climate.hall", history: "no", unit: "K" }] })).toEqual([
      'modules[0] (light.lamp): unknown key "unit"',
      'modules[1] (light.desk): "span" must be a whole number from 1 to 4',
      'modules[2] (climate.hall): "history" must be true or false',
      'modules[2] (climate.hall): "unit" must be one of "°C", "°F" — did you mean "°C"?',
    ]);
  });

  it("says why color, show_control and a bundle are the main card's", () => {
    expect(problems({ modules: [{ entity: "light.lamp", color: "amber", show_control: true }, { joined: ["light.a"] }] })).toEqual([
      'modules[0] (light.lamp): "color" is the main card\'s: field keeps colour for what a control sets (docs/field.md)',
      'modules[0] (light.lamp): "show_control" is the main card\'s: a field row shows its screen in place of a control',
      "modules[1]: bundles are the main card's: list each module on its own",
    ]);
  });
});

describe("parseFieldConfig: sections", () => {
  it("reads titled sections of modules, and column groups of them", () => {
    const config = parseFieldConfig({
      sections: [
        { title: "Quick", note: "Pressed most", columns: 2, modules: ["light.a", { entity: "input_boolean.dnd", span: 3 }] },
        { columns: 3, sections: [{ title: "Living room", modules: ["light.b"] }, { title: "Outside", modules: ["weather.home"] }] },
        { sections: [{ modules: ["light.c"] }] },
      ],
    });
    expect(config.sections).toEqual([
      { kind: "section", title: "Quick", note: "Pressed most", columns: 2, modules: [expect.objectContaining({ entity: "light.a" }), expect.objectContaining({ entity: "input_boolean.dnd", span: 2 })] },
      { kind: "columns", columns: 3, sections: [expect.objectContaining({ title: "Living room" }), expect.objectContaining({ title: "Outside" })] },
      { kind: "columns", columns: 1, sections: [expect.objectContaining({ title: undefined })] },
    ]);
    expect(modulesOf(config.sections!).map((m) => m.entity)).toEqual(["light.a", "input_boolean.dnd", "light.b", "weather.home", "light.c"]);
  });

  it("fills in every module, a column group's too", () => {
    const { sections } = parseFieldConfig({ sections: [{ title: "A", modules: ["light.a"] }, { sections: [{ title: "B", modules: ["light.b"] }] }] });
    const placed = mapModules(sections!, (m) => ({ ...m, area: `Area of ${m.entity}` }));
    expect(modulesOf(placed).map((m) => m.area)).toEqual(["Area of light.a", "Area of light.b"]);
  });

  it("names each mistake with its path, and the main card's words for what field says otherwise", () => {
    expect(problems({
      modules: ["light.a"],
      sections: [
        { title: "Quick", cards: ["light.a"] },
        { title: "Gaps", gap: 4, columns: 6, modules: ["light.b"] },
        { sections: [] },
        "light.c",
        { title: "Living", modules: [{ entity: "light.d", footprnt: "compact" }] },
      ],
    })).toEqual([
      '"modules" and "sections" both lay out the main page: keep one (sections take modules of their own)',
      'sections[0]: "cards" is the main card\'s: a field section lists "modules"',
      'sections[0]: "modules" must be a list of at least one module',
      'sections[1]: "gap" is the main card\'s: field spaces its grid by footprint: 12 px between modules, 8 px between rows',
      'sections[1]: "columns" must be a whole number from 1 to 4',
      'sections[2]: "sections" must be a list of at least one section',
      'sections[3]: a section is a map with "modules" (and usually a "title")',
      'sections[4].modules[0] (light.d): unknown key "footprnt" — did you mean "footprint"?',
    ]);
  });
});

describe("parseFieldConfig: nav and pages", () => {
  it("reads pages and a nav of sections, pages and other dashboards", () => {
    const config = parseFieldConfig({
      sections: [{ title: "Quick", modules: ["light.a"] }],
      pages: [{ id: "nursery", title: "Nursery", sections: [{ title: "Baby", modules: ["sensor.owlet_sock_ac000w0123_sleep_state"] }] }],
      nav: [{ page: "home" }, { section: "Quick", label: "Now" }, { page: "nursery" }, { navigate: "/baby-view/0", label: "Baby view" }],
    });
    expect(config.pages).toEqual([{ id: "nursery", title: "Nursery", blocks: [expect.objectContaining({ kind: "section", title: "Baby", modules: [expect.objectContaining({ kind: "owlet" })] })] }]);
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
      sections: [{ title: "Living room", modules: ["light.a"] }],
      pages: [{ id: "home", title: "Home", sections: [{ modules: ["light.b"] }] }, { title: "Nursery", sections: [] }],
      nav: [{ section: "living room" }, { page: "nursry" }, { navigate: "baby-view" }],
    })).toEqual([
      'pages[0]: "id" can\'t be "home": that is the top-level sections',
      'pages[1]: "id" is required: lower-case letters, digits, - and _, like living-room',
      'pages[1]: "sections" must be a list of at least one section',
      'nav[2]: "navigate" is a Home Assistant path like /baby-view/0',
      'nav[0]: no section titled "living room" in the top-level sections — did you mean "Living room"?',
      'nav[1]: no page "nursry" (pages: "home")',
    ]);
  });

  it("can't check a section named by area: the registries name those", () => {
    expect(problems({ modules: ["light.a"], nav: [{ section: "Kitchen" }] })).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import {
  Reader,
  cardKindOrder,
  cardKinds,
  readAlarmOptions,
  readCard,
  readCards,
  readColor,
  readOwletOptions,
  readUnit,
  readBody,
  renderCard,
  rowTitles,
} from "./schema";
import type { CardReadSchema, FootprintMix, LayoutSchema } from "./schema";

type Kind = "light" | "switch" | "sound" | "owlet";
interface TestCard { entity: string; kind: Kind; name?: string; color?: string; volume?: string; alerts?: Record<string, string> }

const domainKind: Record<string, Kind> = { light: "light", switch: "switch" };

const schema: CardReadSchema<Kind, TestCard> = {
  noun: "card",
  common: ["entity", "card", "name"],
  order: cardKindOrder(domainKind, { sound: {}, owlet: {} }),
  kinds: {
    light: { domains: ["light"], keys: ["color"], options: (read, raw, at) => ({ color: readColor(read, raw, at, ["red"] as const) }) },
    switch: { domains: ["switch"], keys: ["color"], options: (read, raw, at) => ({ color: readColor(read, raw, at, ["red"] as const) }) },
    sound: { domains: ["switch"], keys: ["volume"], options: (read, raw, at) => ({ volume: read.optionalEntity(raw, "volume", at, ["number"]) }) },
    owlet: { domains: ["sensor"], id: /^sensor\.\w+_sleep_state$/, keys: ["alerts"], options: (read, raw, at) => ({ alerts: readOwletOptions(read, raw, at, ["low_oxygen"]).alerts as Record<string, string> }) },
  },
  base: (read, raw, at) => ({ name: read.string(raw, "name", at) }),
  noKind: (entity, domain) => `${entity}: ${domain}.* entities have no card yet`,
};

const read = (value: unknown, at = "sections[0]") => {
  const reader = new Reader();
  const card = readCard(reader, schema, value, at);
  return { card, problems: reader.problems };
};

describe("cardKinds", () => {
  it("picks the domain's own card first and a shared card by its id", () => {
    const pieces = cardKinds(schema.kinds);
    expect(pieces.kindsFor("switch.a")).toEqual(["switch", "sound"]);
    expect(pieces.kindOf("switch.a")).toBe("switch");
    expect(pieces.kindOf("sensor.a_sleep_state")).toBe("owlet");
    expect(pieces.kindsFor("media_player.a")).toEqual([]);
  });

  it("orders a domain's own kind before the cards that share it", () => {
    expect(cardKindOrder(domainKind, { sound: {}, owlet: {} })).toEqual(["light", "switch", "sound", "owlet"]);
  });
});

describe("readCard", () => {
  it("reads the base, the kind and its options from one entity id", () => {
    expect(read("light.a").card).toEqual({ entity: "light.a", kind: "light", name: undefined, color: undefined });
    expect(read({ entity: "switch.noise", card: "sound", volume: "number.noise", name: "Noise" }).card).toEqual({
      entity: "switch.noise", kind: "sound", name: "Noise", volume: "number.noise",
    });
  });

  it("reports an unknown key, a card outside the domain and a domain with no card, at their paths", () => {
    expect(read({ entity: "light.a", volume: "number.a" }).problems).toEqual(['sections[0] (light.a): unknown key "volume"']);
    expect(read({ entity: "light.a", card: "sound" }).problems).toEqual(['sections[0] (light.a): "card" must be one of "light"']);
    expect(read("media_player.a").problems).toEqual(["sections[0]: media_player.a: media_player.* entities have no card yet"]);
    expect(read({ name: "No entity" }).problems).toEqual(['sections[0]: a card needs an "entity"']);
    expect(read(4).problems).toEqual(['sections[0]: a card is an entity id, or a map with an "entity" key']);
  });

  it("stops at an invalid card when the skin says so, instead of reading the default kind", () => {
    const reader = new Reader();
    readCard(reader, { ...schema, stopOnInvalidCard: true }, { entity: "light.a", card: "sound", volume: "number.x" }, "cards[0]");
    expect(reader.problems).toEqual(['cards[0] (light.a): "card" must be one of "light"']);
  });

  it("reports every problem it finds, in path order", () => {
    const reader = new Reader();
    readCard(reader, schema, { entity: "light.a", name: {}, color: "blue" }, "cards[0]");
    expect(reader.problems).toEqual([
      'cards[0] (light.a): "name" must be text',
      'cards[0] (light.a): "color" must be one of "red", "none"',
    ]);
  });
});

describe("readCards", () => {
  it("reads a non-empty list and rejects an empty one with the skin's noun", () => {
    const reader = new Reader();
    expect(readCards(reader, schema, ["light.a"], "cards").map((card) => card.entity)).toEqual(["light.a"]);
    expect(readCards(reader, schema, [], "cards", "module")).toEqual([]);
    expect(reader.problems).toEqual(["cards: must be a list of at least one module"]);
  });
});

describe("shared option readers", () => {
  it("reads a colour with none, and a temperature unit", () => {
    const reader = new Reader();
    expect(readColor(reader, { color: "none" }, "at", ["red"] as const)).toBe("none");
    expect(readColor(reader, { color: "blue" }, "at", ["red"] as const)).toBeUndefined();
    expect(readUnit(reader, { unit: "K" }, "at")).toBeUndefined();
    expect(reader.problems).toEqual(['at: "color" must be one of "red", "none"', 'at: "unit" must be one of "°C", "°F" — did you mean "°C"?']);
  });

  it("reads an alarm's view-only flag, delays and open sensors", () => {
    const reader = new Reader();
    expect(readAlarmOptions(reader, { read_only: true, exit_delay: 30, open_sensors: ["Back door"] }, "alarm")).toEqual({
      readOnly: true, exitDelay: 30, entryDelay: undefined, openSensors: ["Back door"],
    });
    expect(readAlarmOptions(reader, { open_sensors: "Back door" }, "alarm").openSensors).toBeUndefined();
    expect(reader.problems).toEqual(['alarm: "open_sensors" must be a list of names']);
  });

  it("reads an Owlet sock's alert sensors by alert name", () => {
    const reader = new Reader();
    expect(readOwletOptions(reader, { heart_rate: "sensor.bpm", alerts: { low_oxygen: "binary_sensor.low" } }, "owlet", ["low_oxygen"])).toEqual({
      heartRate: "sensor.bpm", oxygen: undefined, charging: undefined, baseStation: undefined, alerts: { low_oxygen: "binary_sensor.low" }, staleAfter: undefined,
    });
    expect(readOwletOptions(reader, { alerts: ["binary_sensor.low"] }, "owlet", ["low_oxygen"]).alerts).toBeUndefined();
    expect(reader.problems).toEqual(['owlet: "alerts" must map alerts to binary_sensor.* entities, like low_oxygen: binary_sensor.sock_low_oxygen']);
  });
});

describe("renderCard", () => {
  it("draws the card with its kind's renderer", () => {
    const renderers = {
      light: (card: TestCard, suffix: string) => `${card.kind}:${suffix}`,
      switch: (card: TestCard, suffix: string) => `${card.kind}:${suffix}`,
      sound: (card: TestCard, suffix: string) => `${card.kind}:${suffix}`,
      owlet: (card: TestCard, suffix: string) => `${card.kind}:${suffix}`,
    };
    expect(renderCard(renderers, { entity: "light.a", kind: "light" }, "drawn")).toBe("light:drawn");
  });
});

interface Tile { entity: string; footprint?: string }
const layout = (mix: FootprintMix = "lattice", maxColumns = 12): LayoutSchema<Tile> => ({
  noun: mix === "stacks" ? "module" : "card",
  maxColumns,
  item: (read, value, path) => {
    const card = readCard(read, { ...schema, common: ["entity", "card", "name", "footprint", "width", "column"], base: (r, raw, at) => ({ name: r.string(raw, "name", at), footprint: r.string(raw, "footprint", at) }) } as CardReadSchema<Kind, TestCard & Tile>, value, path);
    return card && { entity: card.entity, footprint: card.footprint };
  },
  footprints: { mix, of: (tile) => tile.footprint ?? "standard" },
});
const body = (raw: Record<string, unknown>, mix?: FootprintMix, max?: number) => {
  const reader = new Reader();
  const rows = readBody(reader, layout(mix, max), raw);
  return { rows, problems: reader.problems };
};

describe("readBody", () => {
  it("reads plain cards as one untitled row, with the page's columns", () => {
    const { rows, problems } = body({ columns: 2, cards: ["light.a", { entity: "light.b", width: "full" }] });
    expect(problems).toEqual([]);
    expect(rows).toEqual([{ title: undefined, note: undefined, columns: 2, flow: "normal", align: "top", cards: [
      { item: { entity: "light.a", footprint: undefined }, width: 1, column: undefined },
      { item: { entity: "light.b", footprint: undefined }, width: "full", column: undefined },
    ] }]);
  });

  it("is undefined with neither cards nor rows: the skin lays the page out itself", () => {
    expect(body({ title: "Home" }).rows).toBeUndefined();
  });

  it("reads rows, each inheriting the page's columns and flow unless it sets its own, auto included", () => {
    const { rows, problems } = body({ columns: 3, flow: "dense", rows: [
      { title: "A", cards: ["light.a"] },
      { title: "B", columns: "auto", flow: "normal", align: "bottom", cards: ["light.b"] },
    ] });
    expect(problems).toEqual([]);
    expect(rows!.map((r) => [r.title, r.columns, r.flow, r.align])).toEqual([["A", 3, "dense", "top"], ["B", undefined, "normal", "bottom"]]);
    expect(rowTitles(rows)).toEqual(["A", "B"]);
  });

  it("names every layout mistake at its path with the fix, all at once", () => {
    expect(body({ cards: ["light.a"], rows: [{ cards: ["light.b"] }] }).problems).toEqual([
      '"cards" and "rows" both lay out this page: keep "cards" for one plain grid, or move those cards into a row under "rows"',
    ]);
    expect(body({ rows: [{ columns: 3, cards: [
      { entity: "light.a", column: 4 },
      { entity: "light.b", width: 4 },
      { entity: "light.c", column: 2, width: 3 },
      { entity: "light.d", width: "200px" },
      { entity: "light.e", span: 2 },
      { entity: "light.f", width: "full", column: 2 },
    ] }] }).problems).toEqual([
      'rows[0].cards[0] (light.a): "column: 4" is past this row\'s 3 columns: use column: 3, or raise the row\'s columns to 4',
      'rows[0].cards[1] (light.b): "width: 4" is wider than this row\'s 3 columns: use width: full, or raise the row\'s columns to 4',
      'rows[0].cards[2] (light.c): starts in column 2 and spans 3, past this row\'s 3 columns: use column: 1, or raise the row\'s columns to 4',
      'rows[0].cards[3] (light.d): "width" is how many columns the card spans: a whole number from 1 to 12, or full — not pixels',
      'rows[0].cards[4] (light.e): "span" isn\'t a key: a card spans columns with "width", a whole number or full',
      'rows[0].cards[5] (light.f): "width: full" spans the whole row from column 1: leave out "column", or give a number of columns',
    ]);
  });

  it("refuses nested rows, misplaced keys and a card where a row belongs, saying where each goes", () => {
    expect(body({ align: "bottom", rows: ["light.a", { rows: [], width: 2, cards: ["light.b"] }, { title: "Empty" }] }).problems).toEqual([
      'align: lines up one row\'s columns: put it on a row under "rows"',
      'rows[0] (light.a): this is a card, not a row: put it in a row\'s "cards", or list the cards under "cards" at the top for one plain grid',
      'rows[1]: rows don\'t nest: list this row\'s cards under its own "cards", and put the inner rows beside it in the page\'s "rows"',
      'rows[1]: "width" places one card inside a row: put it on the card',
      'rows[2]: "cards" must be a list of at least one card',
    ]);
    expect(body({ sections: [], modules: [] }).problems).toEqual([
      'sections: isn\'t a key: list the page\'s cards under "cards" for one plain grid, or under "rows" in titled groups (each row: title, columns, cards)',
      'modules: isn\'t a key: list the page\'s cards under "cards", or under "rows" in titled groups',
    ]);
  });

  it("checks columns are a whole number in range, or auto, and points out a quoted one", () => {
    expect(body({ columns: "2", cards: ["light.a"] }).problems).toEqual(['"columns" must be a whole number from 1 to 12, or auto — write columns: 2, without quotes']);
    expect(body({ rows: [{ columns: 5, cards: ["light.a"] }] }, "stacks", 4).problems).toEqual(['rows[0]: "columns" must be a whole number from 1 to 4, or auto']);
    expect(body({ cards: "light.a" }).problems).toEqual(['cards: must be a list of at least one card: entity ids like light.kitchen, or maps with an "entity" — each on its own line starting with "- "']);
  });

  it("keeps one footprint per row where the skin asks, naming the fewer to move", () => {
    expect(body({ cards: ["light.a", "light.b", { entity: "light.c", footprint: "compact" }] }, "uniform").problems).toEqual([
      'cards: this skin draws one footprint per row, and this row mixes standard and compact: move the compact cards into a row of their own',
    ]);
  });

  it("stacks mixed footprints by column where the skin does, asking each module for its column", () => {
    const stacked = body({ rows: [{ cards: [{ entity: "light.a", column: 1 }, { entity: "light.b", column: 1, footprint: "compact" }, { entity: "light.c", column: 2 }] }] }, "stacks", 4);
    expect(stacked.problems).toEqual([]);
    expect(stacked.rows![0].stacks).toBe(true);
    expect(body({ rows: [{ flow: "dense", cards: [{ entity: "light.a", column: 1 }, { entity: "light.b", footprint: "compact" }, { entity: "light.c", column: 2, width: 2 }] }] }, "stacks", 4).problems).toEqual([
      'rows[0]: "flow: dense" fills holes in a grid, and this row stacks its mixed footprints by column, so it has none: leave out "flow"',
      'rows[0].cards[1] (light.b): this row mixes standard and compact modules, so each stacks in a column: give it a "column", or move the compact ones into a row of their own',
      'rows[0].cards[2] (light.c): a module in a column stack is one column wide: leave out "width"',
    ]);
  });

  it("collects a card's own problems alongside the layout's", () => {
    expect(body({ rows: [{ title: "A", colums: 2, cards: [{ entity: "light.a", colr: "red" }] }] }).problems).toEqual([
      'rows[0]: unknown key "colums" — did you mean "columns"?',
      'rows[0].cards[0] (light.a): unknown key "colr" — did you mean "color"?',
    ]);
  });
});

describe("pages", () => {
  it("reads each page's id, title and body, and refuses a page with neither cards nor rows", () => {
    const reader = new Reader();
    const pages = reader.pages({ pages: [{ id: "living", title: "Living", cards: ["light.a"] }, { id: "empty", title: "Empty" }, { id: "home", title: "Home", rows: [{ cards: ["light.b"] }] }] }, (raw, path) => readBody(reader, layout(), raw, path));
    expect(pages!.map((p) => [p.id, p.body.length])).toEqual([["living", 1]]);
    expect(reader.problems).toEqual(['pages[1]: a page needs "cards", or "rows" of cards', 'pages[2]: "id" can\'t be "home": that is the main page']);
  });
});

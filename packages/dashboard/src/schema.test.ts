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
  renderCard,
} from "./schema";
import type { CardReadSchema } from "./schema";

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

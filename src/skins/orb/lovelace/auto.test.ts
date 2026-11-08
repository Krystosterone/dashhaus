import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { autoDashboard } from "./auto";
import type { AutoState } from "./auto";
import { parseDashboardConfig } from "./config";
import { roomSensors } from "@dashhaus/core/lovelace";

const state = (entity_id: string, attributes: Record<string, unknown> = {}): AutoState => ({ entity_id, state: "on", attributes });
const states = Object.fromEntries([
  state("alarm_control_panel.house"),
  state("weather.home"),
  state("climate.hall", { friendly_name: "Hall" }),
  state("climate.attic", { friendly_name: "Attic" }),
  state("sensor.bed_t", { device_class: "temperature" }),
  state("sensor.bed_h", { device_class: "humidity" }),
  state("sensor.bed_b", { device_class: "battery" }),
  state("sensor.bath_h", { device_class: "humidity" }),
  state("sensor.power", { device_class: "power" }),
  state("input_boolean.guest"),
  state("sensor.owlet_sock_b_sleep_state", { friendly_name: "B" }),
  state("sensor.owlet_sock_a_sleep_state", { friendly_name: "A" }),
  state("light.bed", { friendly_name: "Bed" }),
  state("cover.bed", { friendly_name: "Blind" }),
  state("switch.plug_child_lock"),
  state("light.hidden"),
  state("light.porch"),
].map((s) => [s.entity_id, s]));

const input = {
  states,
  entities: {
    "sensor.bed_t": { device_id: "bed" },
    "sensor.bed_h": { device_id: "bed" },
    "sensor.bed_b": { device_id: "bed", entity_category: "diagnostic" },
    "sensor.bath_h": { device_id: "bath" },
    "light.bed": { device_id: "lamp" },
    "cover.bed": { area_id: "bedroom" },
    "switch.plug_child_lock": { entity_category: "config" },
    "light.hidden": { hidden: true },
  },
  devices: { lamp: { area_id: "bedroom" } },
  areas: { bedroom: { name: "Bedroom" } },
};

describe("autoDashboard", () => {
  it("puts every room sensor in the Rooms row, with its humidity and battery where it has them", () => {
    const rooms = (autoDashboard(input).rows as { title: string; cards: unknown[] }[]).find((s) => s.title === "Rooms")!.cards;
    expect(rooms).toEqual(roomSensors(input).map((r) => (r.humidity || r.battery ? r : r.entity)));
  });

  it("lays out actions, household status, then the room and environment glance", () => {
    expect(autoDashboard(input)).toEqual({
      type: "custom:dashhaus-orb",
      title: "Home",
      rows: [
        { title: "Comfort", cards: ["climate.attic", { entity: "climate.hall", footprint: "compact" }] },
        { title: "Modes", columns: 2, cards: [{ entity: "input_boolean.guest", footprint: "compact" }] },
        { title: "Bedroom", cards: [{ entity: "cover.bed", footprint: "compact" }, { entity: "light.bed", footprint: "compact" }] },
        { title: "Other", cards: [{ entity: "light.porch", footprint: "compact" }] },
        { title: "Security", cards: [{ entity: "alarm_control_panel.house", footprint: "compact" }] },
        { title: "Nursery", cards: ["sensor.owlet_sock_a_sleep_state", "sensor.owlet_sock_b_sleep_state"] },
        { title: "Outside", cards: ["weather.home"] },
        { title: "Rooms", cards: [{ entity: "sensor.bed_t", humidity: "sensor.bed_h", battery: "sensor.bed_b" }, "sensor.bath_h"] },
      ],
    });
  });

  it("puts locks under Security after the alarm, each with its device's battery", () => {
    const withLocks = {
      ...input,
      states: { ...states, ...Object.fromEntries([
        state("lock.front", { friendly_name: "Front door" }),
        state("lock.back", { friendly_name: "Back door" }),
        state("sensor.front_battery", { device_class: "battery" }),
      ].map((s) => [s.entity_id, s])) },
      entities: { ...input.entities, "lock.front": { device_id: "front" }, "sensor.front_battery": { device_id: "front", entity_category: "diagnostic" } },
    };
    const security = (autoDashboard(withLocks).rows as { title: string; cards: unknown[] }[]).find((s) => s.title === "Security");
    expect(security?.cards).toEqual([
      { entity: "alarm_control_panel.house", footprint: "compact" },
      { entity: "lock.back", footprint: "compact" },
      { entity: "lock.front", footprint: "compact", battery: "sensor.front_battery" },
    ]);
    expect(() => parseDashboardConfig(autoDashboard(withLocks))).not.toThrow();
  });

  it("puts doors, windows, leaks and smoke under Security after the locks, each with its device's battery, and no other binary sensor", () => {
    const withSensors = {
      ...input,
      states: { ...states, ...Object.fromEntries([
        state("lock.front", { friendly_name: "Front door" }),
        state("binary_sensor.patio", { friendly_name: "Patio door", device_class: "door" }),
        state("binary_sensor.sink", { friendly_name: "Leak", device_class: "moisture" }),
        state("binary_sensor.hall_motion", { friendly_name: "Hall motion", device_class: "motion" }),
        state("sensor.patio_battery", { device_class: "battery" }),
      ].map((s) => [s.entity_id, s])) },
      entities: { ...input.entities, "binary_sensor.patio": { device_id: "patio" }, "sensor.patio_battery": { device_id: "patio", entity_category: "diagnostic" } },
    };
    const security = (autoDashboard(withSensors).rows as { title: string; cards: unknown[] }[]).find((s) => s.title === "Security");
    expect(security?.cards).toEqual([
      { entity: "alarm_control_panel.house", footprint: "compact" },
      { entity: "lock.front", footprint: "compact" },
      { entity: "binary_sensor.sink", footprint: "compact" },
      { entity: "binary_sensor.patio", footprint: "compact", battery: "sensor.patio_battery" },
    ]);
    const parsed = parseDashboardConfig(autoDashboard(withSensors)).rows?.find((row) => row.title === "Security");
    expect(parsed?.cards.map((entry) => entry.item.kind)).toEqual(["alarm", "lock", "binarySensor", "binarySensor"]);
  });

  it("puts the room's air quality in Rooms after the room sensors, as numeric cards, and leaves power to a person", () => {
    const withAir = {
      ...input,
      states: { ...states, ...Object.fromEntries([
        state("sensor.living_co2", { friendly_name: "Living room CO2", device_class: "carbon_dioxide" }),
        state("sensor.living_pm25", { friendly_name: "Living room PM2.5", device_class: "pm25" }),
      ].map((s) => [s.entity_id, s])) },
      entities: { ...input.entities, "sensor.living_co2": { device_id: "air" }, "sensor.living_pm25": { device_id: "air" } },
    };
    const rooms = (autoDashboard(withAir).rows as { title: string; cards: unknown[] }[]).find((s) => s.title === "Rooms");
    expect(rooms?.cards.slice(-1)).toEqual([{ entity: "sensor.living_co2", card: "numeric" }]);
    const parsed = parseDashboardConfig(autoDashboard(withAir)).rows?.find((row) => row.title === "Rooms");
    expect(parsed?.cards.map((entry) => entry.item.kind)).toEqual(["sensor", "sensor", "numeric"]);
  });

  it("produces a config the card accepts", () => {
    const card = autoDashboard(input, "Flat");
    expect(() => parseDashboardConfig(card)).not.toThrow();
  });

  it("places sleep state sensors that the card draws as owlet socks", () => {
    const rows = parseDashboardConfig(autoDashboard(input)).rows ?? [];
    const nursery = rows.find((row) => row.title === "Nursery");
    expect(nursery?.cards.map((entry) => entry.item.kind)).toEqual(["owlet", "owlet"]);
  });

  it("never repeats a row title: an area called Nursery or Outside takes the sock or the weather", () => {
    const card = autoDashboard({
      states: {
        "light.nursery": state("light.nursery"),
        "light.patio": state("light.patio"),
        "sensor.owlet_sock_a_sleep_state": state("sensor.owlet_sock_a_sleep_state"),
        "weather.home": state("weather.home"),
      },
      entities: { "light.nursery": { area_id: "nursery" }, "light.patio": { area_id: "outside" } },
      areas: { nursery: { name: "Nursery" }, outside: { name: "Outside" } },
    });
    const rows = card.rows as { title: string; cards: unknown[] }[];
    expect(rows.map((s) => s.title)).toEqual(["Nursery", "Outside"]);
    expect(rows[0].cards).toEqual([{ entity: "light.nursery", footprint: "compact" }, "sensor.owlet_sock_a_sleep_state"]);
    expect(rows[1].cards).toEqual([{ entity: "light.patio", footprint: "compact" }, "weather.home"]);
  });

  it("puts each guest Wi-Fi code under Guests, drawn as the guestWifi card", () => {
    const card = autoDashboard({ ...input, states: { ...states, "sensor.67d9d6d6ad84e044caf4621c_voucher": state("sensor.67d9d6d6ad84e044caf4621c_voucher") } });
    const rows = card.rows as { title: string; cards: unknown[] }[];
    expect(rows.map((s) => s.title)).toEqual(["Comfort", "Modes", "Bedroom", "Other", "Security", "Nursery", "Guests", "Outside", "Rooms"]);
    expect(rows.find((s) => s.title === "Guests")!.cards).toEqual(["sensor.67d9d6d6ad84e044caf4621c_voucher"]);
    const parsed = parseDashboardConfig(card).rows!.find((s) => s.title === "Guests")!;
    expect(parsed.cards.map((c) => c.item)).toEqual([expect.objectContaining({ kind: "guestWifi", entity: "sensor.67d9d6d6ad84e044caf4621c_voucher" })]);
  });

  it("puts every camera under Cameras after Security, at its standard footprint so its still shows", () => {
    const card = autoDashboard({ ...input, states: { ...states, "camera.nursery": state("camera.nursery", { friendly_name: "Nursery" }), "camera.door": state("camera.door", { friendly_name: "Front door" }) } });
    const rows = card.rows as { title: string; cards: unknown[] }[];
    expect(rows.map((s) => s.title)).toEqual(["Comfort", "Modes", "Bedroom", "Other", "Security", "Cameras", "Nursery", "Outside", "Rooms"]);
    expect(rows.find((s) => s.title === "Cameras")!.cards).toEqual(["camera.door", "camera.nursery"]);
    const parsed = parseDashboardConfig(card).rows!.find((s) => s.title === "Cameras")!;
    expect(parsed.cards.map((c) => c.item.kind)).toEqual(["camera", "camera"]);
  });

  it("lays out every band in the order spec/deploy.md gives: actions, safety and security, cameras, household status, the glance", () => {
    const every = {
      ...input,
      states: {
        ...states,
        "lock.front": state("lock.front"),
        "binary_sensor.back_door": state("binary_sensor.back_door", { device_class: "door" }),
        "camera.door": state("camera.door"),
        "sensor.67d9d6d6ad84e044caf4621c_voucher": state("sensor.67d9d6d6ad84e044caf4621c_voucher"),
        "calendar.family": state("calendar.family"),
      },
      energy: { energy_sources: [{ type: "grid", stat_rate: "sensor.power" }] },
    };
    const titles = (autoDashboard(every).rows as { title: string }[]).map((s) => s.title);
    // The rule's row titles, in its order; an area's row stands where the rule says "a row per area".
    const spec = readFileSync(join(process.cwd(), "spec/deploy.md"), "utf8");
    const rule = spec.slice(spec.indexOf("#### The automatic layout's order"), spec.indexOf("\nA row whose title an area already has"));
    const listed = [...rule.matchAll(/^\d\. .*(?:\n {3}.*)*/gm)].flatMap(([item]) => [...item.matchAll(/`([A-Z]\w+)`|(a row per area)/g)].map((m) => m[1] ?? "Bedroom"));
    expect(listed).toEqual(["Comfort", "Modes", "Bedroom", "Other", "Security", "Cameras", "Nursery", "Guests", "Calendar", "Outside", "Rooms", "Energy"]);
    expect(titles).toEqual(listed);
  });

  it("puts the house's power and energy meters from its energy preferences under Energy, last, as numeric cards", () => {
    const withEnergy = {
      ...input,
      states: { ...states, "sensor.grid_import": state("sensor.grid_import", { device_class: "energy" }), "sensor.solar_power": state("sensor.solar_power", { device_class: "power" }) },
      energy: {
        energy_sources: [
          { type: "solar", stat_energy_from: "sensor.missing", stat_rate: "sensor.solar_power" },
          { type: "grid", stat_energy_from: "sensor.grid_import", stat_energy_to: null, stat_rate: "sensor.power" },
          { type: "gas", stat_energy_from: "sensor.bed_t" },
        ],
      },
    };
    const rows = autoDashboard(withEnergy).rows as { title: string; cards: unknown[] }[];
    expect(rows.map((s) => s.title).slice(-2)).toEqual(["Rooms", "Energy"]);
    expect(rows.at(-1)!.cards).toEqual([
      { entity: "sensor.power", card: "numeric" },
      { entity: "sensor.solar_power", card: "numeric" },
      { entity: "sensor.grid_import", card: "numeric" },
    ]);
    const parsed = parseDashboardConfig(autoDashboard(withEnergy)).rows!.at(-1)!;
    // No footprint written: the standard one, so a meter's today says what it rose.
    expect(parsed.cards.map((c) => [c.item.kind, "footprint" in c.item ? c.item.footprint ?? "standard" : "bundle"])).toEqual([["numeric", "standard"], ["numeric", "standard"], ["numeric", "standard"]]);
  });

  it("has no Energy row without energy preferences, or with none it can draw", () => {
    expect((autoDashboard(input).rows as { title: string }[]).map((s) => s.title)).not.toContain("Energy");
    expect((autoDashboard({ ...input, energy: { energy_sources: [] } }).rows as { title: string }[]).map((s) => s.title)).not.toContain("Energy");
    expect((autoDashboard({ ...input, energy: { energy_sources: [{ type: "grid", stat_rate: "opower:elec" }] } }).rows as { title: string }[]).map((s) => s.title)).not.toContain("Energy");
  });

  it("joins an area called Energy, and never draws a meter twice", () => {
    const card = autoDashboard({
      states: { "switch.meter_relay": state("switch.meter_relay"), "sensor.grid": state("sensor.grid", { device_class: "power" }), "sensor.co2": state("sensor.co2", { device_class: "carbon_dioxide" }) },
      entities: { "switch.meter_relay": { area_id: "energy" } },
      areas: { energy: { name: "Energy" } },
      energy: { energy_sources: [{ type: "grid", stat_rate: "sensor.grid", stat_energy_from: "sensor.co2" }] },
    });
    const rows = card.rows as { title: string; cards: unknown[] }[];
    expect(rows.map((s) => s.title)).toEqual(["Energy", "Rooms"]);
    expect(rows[0].cards).toEqual([{ entity: "switch.meter_relay", footprint: "compact" }, { entity: "sensor.grid", card: "numeric" }]);
    expect(rows[1].cards).toEqual([{ entity: "sensor.co2", card: "numeric" }]);
  });

  it("places a media player with the controls in its area, after the fans, drawn as the media player card", () => {
    const card = autoDashboard({
      states: { "fan.bed": state("fan.bed", { friendly_name: "Fan" }), "media_player.bed": state("media_player.bed", { friendly_name: "Bedroom speaker" }) },
      entities: { "fan.bed": { area_id: "bedroom" }, "media_player.bed": { area_id: "bedroom" } },
      areas: { bedroom: { name: "Bedroom" } },
    });
    expect(card.rows).toEqual([{ title: "Bedroom", cards: [{ entity: "fan.bed", footprint: "compact" }, { entity: "media_player.bed", footprint: "compact" }] }]);
    expect(parseDashboardConfig(card).rows![0].cards[1].item).toEqual(expect.objectContaining({ kind: "mediaPlayer", entity: "media_player.bed" }));
  });

  it("places a robot vacuum with the controls in its area, after the fans, drawn as the vacuum card", () => {
    const card = autoDashboard({
      states: { "fan.bed": state("fan.bed", { friendly_name: "Fan" }), "vacuum.robot": state("vacuum.robot", { friendly_name: "Robot vacuum" }) },
      entities: { "fan.bed": { area_id: "bedroom" }, "vacuum.robot": { area_id: "bedroom" } },
      areas: { bedroom: { name: "Bedroom" } },
    });
    expect(card.rows).toEqual([{ title: "Bedroom", cards: [{ entity: "fan.bed", footprint: "compact" }, { entity: "vacuum.robot", footprint: "compact" }] }]);
    expect(parseDashboardConfig(card).rows![0].cards[1].item).toEqual(expect.objectContaining({ kind: "vacuum", entity: "vacuum.robot" }));
  });

  it("puts the sun beside the weather, outside", () => {
    const card = autoDashboard({ ...input, states: { ...states, "sun.sun": state("sun.sun") } });
    const rows = card.rows as { title: string; cards: unknown[] }[];
    expect(rows.find((s) => s.title === "Outside")!.cards).toEqual(["weather.home", "sun.sun"]);
    const parsed = parseDashboardConfig(card).rows!.find((s) => s.title === "Outside")!;
    expect(parsed.cards.map((c) => c.item)).toEqual([expect.objectContaining({ kind: "weather" }), expect.objectContaining({ kind: "sun", entity: "sun.sun" })]);
  });

  it("puts every visible calendar under Calendar, after the guests and before the outside", () => {
    const card = autoDashboard({
      ...input,
      states: { ...states, "calendar.school": state("calendar.school"), "calendar.family": state("calendar.family"), "sensor.67d9d6d6ad84e044caf4621c_voucher": state("sensor.67d9d6d6ad84e044caf4621c_voucher") },
    });
    const rows = card.rows as { title: string; cards: unknown[] }[];
    expect(rows.map((s) => s.title)).toEqual(["Comfort", "Modes", "Bedroom", "Other", "Security", "Nursery", "Guests", "Calendar", "Outside", "Rooms"]);
    expect(rows.find((s) => s.title === "Calendar")!.cards).toEqual(["calendar.family", "calendar.school"]);
    const parsed = parseDashboardConfig(card).rows!.find((s) => s.title === "Calendar")!;
    expect(parsed.cards.map((c) => c.item)).toEqual([
      expect.objectContaining({ kind: "calendar", entity: "calendar.family", events: true }),
      expect.objectContaining({ kind: "calendar", entity: "calendar.school" }),
    ]);
  });

  it("stays automatic when there is nothing to place", () => {
    const empty = autoDashboard({ states: {} });
    expect(empty).toEqual({ type: "custom:dashhaus-orb", title: "Home" });
    expect(parseDashboardConfig(empty).rows).toBeUndefined();
  });

  it("works from states alone, as on a frontend without registries", () => {
    expect(autoDashboard({ states: { "light.a": state("light.a") } }).rows).toEqual([{ title: "Other", cards: [{ entity: "light.a", footprint: "compact" }] }]);
  });
});

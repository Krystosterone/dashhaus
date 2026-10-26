import { describe, expect, it } from "vitest";
import { autoDashboard, lovelaceDashboard } from "./auto";
import type { AutoState } from "./auto";
import { parseDashboardConfig } from "./config";
import type { SectionConfig } from "./config";

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
  it("lays out actions, household status, then the room and environment glance", () => {
    expect(autoDashboard(input)).toEqual({
      type: "custom:home-dashboard",
      title: "Home",
      sections: [
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

  it("produces a config the card accepts, inside a panel view", () => {
    const card = autoDashboard(input, "Flat");
    expect(() => parseDashboardConfig(card)).not.toThrow();
    expect(lovelaceDashboard(card, "Flat")).toEqual({ views: [{ title: "Flat", path: "home", type: "panel", cards: [card] }] });
  });

  it("places sleep state sensors that the card draws as owlet socks", () => {
    const blocks = parseDashboardConfig(autoDashboard(input)).blocks ?? [];
    const nursery = blocks.find((b): b is SectionConfig => b.kind === "section" && b.title === "Nursery");
    expect(nursery?.items.map((item) => item.kind)).toEqual(["owlet", "owlet"]);
  });

  it("never repeats a section title: an area called Nursery or Outside takes the sock or the weather", () => {
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
    const sections = card.sections as { title: string; cards: unknown[] }[];
    expect(sections.map((s) => s.title)).toEqual(["Nursery", "Outside"]);
    expect(sections[0].cards).toEqual([{ entity: "light.nursery", footprint: "compact" }, "sensor.owlet_sock_a_sleep_state"]);
    expect(sections[1].cards).toEqual([{ entity: "light.patio", footprint: "compact" }, "weather.home"]);
  });

  it("stays automatic when there is nothing to place", () => {
    const empty = autoDashboard({ states: {} });
    expect(empty).toEqual({ type: "custom:home-dashboard", title: "Home" });
    expect(parseDashboardConfig(empty).blocks).toBeUndefined();
  });

  it("works from states alone, as on a frontend without registries", () => {
    expect(autoDashboard({ states: { "light.a": state("light.a") } }).sections).toEqual([{ title: "Other", cards: [{ entity: "light.a", footprint: "compact" }] }]);
  });
});

import { describe, expect, it } from "vitest";
import { autoDashboard, lovelaceDashboard } from "./auto";
import type { AutoState } from "./auto";
import { parseDashboardConfig } from "./config";

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
  it("lays out alerts, the glance, modes, the nursery, then compact controls per area", () => {
    expect(autoDashboard(input)).toEqual({
      type: "custom:home-dashboard",
      title: "Home",
      sections: [
        { title: "Security", cards: [{ entity: "alarm_control_panel.house", footprint: "compact" }] },
        { title: "Outside", cards: ["weather.home"] },
        { title: "Comfort", cards: ["climate.attic", { entity: "climate.hall", footprint: "compact" }] },
        { title: "Rooms", columns: 2, cards: [{ entity: "sensor.bed_t", humidity: "sensor.bed_h", battery: "sensor.bed_b" }, "sensor.bath_h"] },
        { title: "Modes", columns: 2, cards: [{ entity: "input_boolean.guest", footprint: "compact" }] },
        { title: "Nursery", cards: ["sensor.owlet_sock_a_sleep_state", "sensor.owlet_sock_b_sleep_state"] },
        { title: "Bedroom", cards: [{ entity: "cover.bed", footprint: "compact" }, { entity: "light.bed", footprint: "compact" }] },
        { title: "Other", cards: [{ entity: "light.porch", footprint: "compact" }] },
      ],
    });
  });

  it("produces a config the card accepts, inside a panel view", () => {
    const card = autoDashboard(input, "Flat");
    expect(() => parseDashboardConfig(card)).not.toThrow();
    expect(lovelaceDashboard(card, "Flat")).toEqual({ views: [{ title: "Flat", path: "home", type: "panel", cards: [card] }] });
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

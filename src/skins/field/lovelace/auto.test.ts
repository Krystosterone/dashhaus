import { describe, expect, it } from "vitest";
import { areaRows, autoModules, energyModules, groupByArea } from "./auto";
import { parseFieldConfig } from "./config";
import type { ModuleConfig } from "./config";

const state = (id: string, name: string, device_class?: string) => ({ entity_id: id, state: "on", attributes: { friendly_name: name, ...(device_class && { device_class }) } });

describe("autoModules", () => {
  it("takes every supported entity by name, leaving out hidden, config and diagnostic ones and other domains", () => {
    const modules = autoModules({
      states: { "light.b": state("light.b", "Bedside"), "light.a": state("light.a", "Attic"), "climate.hall": state("climate.hall", "Hall"), "light.h": state("light.h", "Hidden"), "light.c": state("light.c", "Config"), "input_text.n": state("input_text.n", "Note") },
      entities: { "light.h": { hidden: true }, "light.c": { entity_category: "config" } },
    });
    expect(modules).toEqual([{ entity: "light.a", kind: "light" }, { entity: "light.b", kind: "light" }, { entity: "climate.hall", kind: "climate" }]);
  });

  it("takes room air of sensors, one per device with its companions, among the rest by name", () => {
    const modules = autoModules({
      states: {
        "light.lamp": state("light.lamp", "Lamp"),
        "sensor.bed_t": state("sensor.bed_t", "Bedroom", "temperature"),
        "sensor.bed_h": state("sensor.bed_h", "Bedroom humidity", "humidity"),
        "sensor.bed_b": state("sensor.bed_b", "Bedroom battery", "battery"),
        "sensor.power": state("sensor.power", "Power", "power"),
      },
      entities: { "sensor.bed_t": { device_id: "bed" }, "sensor.bed_h": { device_id: "bed" }, "sensor.bed_b": { device_id: "bed", entity_category: "diagnostic" } },
    });
    expect(modules).toEqual([{ entity: "sensor.bed_t", humidity: "sensor.bed_h", battery: "sensor.bed_b", kind: "sensor" }, { entity: "light.lamp", kind: "light" }]);
  });

  it("takes the room's air quality as numeric modules, one per device, and leaves power to a person", () => {
    expect(autoModules({
      states: {
        "sensor.living_co2": state("sensor.living_co2", "Living room CO2", "carbon_dioxide"),
        "sensor.living_pm25": state("sensor.living_pm25", "Living room PM2.5", "pm25"),
        "sensor.power": state("sensor.power", "Power", "power"),
      },
      entities: { "sensor.living_co2": { device_id: "air" }, "sensor.living_pm25": { device_id: "air" } },
    })).toEqual([{ entity: "sensor.living_co2", kind: "numeric" }]);
    expect(parseFieldConfig({ cards: [{ entity: "sensor.house_energy", card: "numeric", unit: "kWh" }] }).rows?.[0].cards[0].item).toMatchObject({ kind: "numeric", readingUnit: "kWh" });
    expect(parseFieldConfig({ cards: [{ entity: "sensor.house_energy" }] }).rows?.[0].cards[0].item).toMatchObject({ kind: "sensor" });
  });

  it("takes the first weather entity by name, with the sun for night", () => {
    const modules = autoModules({
      states: { "weather.met": state("weather.met", "Met"), "weather.home": state("weather.home", "Home"), "light.lamp": state("light.lamp", "Lamp") },
    });
    expect(modules).toEqual([{ entity: "weather.home", kind: "weather", sun: "sun.sun" }, { entity: "light.lamp", kind: "light" }]);
  });

  it("takes every visible input_boolean and switch as a toggle", () => {
    const modules = autoModules({
      states: { "input_boolean.guest": state("input_boolean.guest", "Guest"), "switch.fan": state("switch.fan", "Fan"), "switch.led": state("switch.led", "Status LED") },
      entities: { "switch.led": { entity_category: "config" } },
    });
    expect(modules).toEqual([{ entity: "switch.fan", kind: "toggle" }, { entity: "input_boolean.guest", kind: "toggle" }]);
  });

  it("takes every visible humidifier", () => {
    expect(autoModules({ states: { "humidifier.bedroom": state("humidifier.bedroom", "Bedroom") } })).toEqual([{ entity: "humidifier.bedroom", kind: "humidifier" }]);
  });

  it("takes every visible media player", () => {
    expect(autoModules({ states: { "media_player.kitchen": state("media_player.kitchen", "Kitchen speaker") } })).toEqual([{ entity: "media_player.kitchen", kind: "mediaPlayer" }]);
  });

  it("takes every visible vacuum", () => {
    expect(autoModules({ states: { "vacuum.robot_vacuum": state("vacuum.robot_vacuum", "Robot vacuum") } })).toEqual([{ entity: "vacuum.robot_vacuum", kind: "vacuum" }]);
  });

  it("takes the sun, and draws it as the sun's module", () => {
    expect(autoModules({ states: { "sun.sun": state("sun.sun", "Sun") } })).toEqual([{ entity: "sun.sun", kind: "sun" }]);
    expect(parseFieldConfig({ cards: [{ entity: "sun.sun", history: false }] }).rows?.[0].cards[0].item).toMatchObject({ kind: "sun", history: false });
  });

  it("takes every visible calendar, and reads its other calendars, horizon and events setting", () => {
    expect(autoModules({ states: { "calendar.family": state("calendar.family", "Family") } })).toEqual([{ entity: "calendar.family", kind: "calendar" }]);
    expect(parseFieldConfig({ cards: [{ entity: "calendar.family", calendars: ["calendar.school"], days: 14 }] }).rows?.[0].cards[0].item)
      .toMatchObject({ kind: "calendar", calendars: ["calendar.school"], days: 14, events: true });
  });

  it("takes a Dyson's fan as the dyson module, and its heater not on its own", () => {
    const modules = autoModules({
      states: {
        "fan.desk": state("fan.desk", "Desk fan"),
        "fan.living_room": state("fan.living_room", "Hot+Cool"),
        "switch.living_room_night_mode": state("switch.living_room_night_mode", "Hot+Cool Night Mode"),
        "sensor.living_room_hepa_filter_life": state("sensor.living_room_hepa_filter_life", "Hot+Cool HEPA Filter Life"),
        "climate.living_room": state("climate.living_room", "Hot+Cool heater"),
        "climate.hall": state("climate.hall", "Hall"),
      },
      entities: { "switch.living_room_night_mode": { entity_category: "config" }, "sensor.living_room_hepa_filter_life": { entity_category: "diagnostic" } },
    });
    expect(modules).toEqual([{ entity: "fan.desk", kind: "fan" }, { entity: "climate.hall", kind: "climate" }, { entity: "fan.living_room", kind: "dyson" }]);
  });

  it("takes every visible cover", () => {
    expect(autoModules({ states: { "cover.garage_door": state("cover.garage_door", "Garage door") } })).toEqual([{ entity: "cover.garage_door", kind: "cover" }]);
  });

  it("takes every visible Owlet sock by its sleep state sensor, among the rest by name, and leaves its readings out", () => {
    const modules = autoModules({
      states: {
        "sensor.owlet_sock_a_sleep_state": state("sensor.owlet_sock_a_sleep_state", "Nova"),
        "sensor.owlet_sock_a_heart_rate": state("sensor.owlet_sock_a_heart_rate", "Nova heart rate"),
        "light.lamp": state("light.lamp", "Lamp"),
      },
    });
    expect(modules).toEqual([{ entity: "light.lamp", kind: "light" }, { entity: "sensor.owlet_sock_a_sleep_state", kind: "owlet" }]);
  });

  it("takes every guest Wi-Fi code by its voucher sensor, not as a room sensor", () => {
    const modules = autoModules({
      states: {
        "sensor.67d9d6d6ad84e044caf4621c_voucher": state("sensor.67d9d6d6ad84e044caf4621c_voucher", "UniFi Hotspot Manager Voucher"),
        "light.lamp": state("light.lamp", "Lamp"),
      },
    });
    expect(modules).toEqual([{ entity: "light.lamp", kind: "light" }, { entity: "sensor.67d9d6d6ad84e044caf4621c_voucher", kind: "guestWifi" }]);
  });

  it("takes every visible lock, with the battery sensor on its device", () => {
    expect(autoModules({
      states: { "lock.front": state("lock.front", "Front door"), "sensor.front_battery": { attributes: { friendly_name: "Front door battery", device_class: "battery" } }, "lock.back": state("lock.back", "Back door") },
      entities: { "lock.front": { device_id: "front" }, "sensor.front_battery": { device_id: "front", entity_category: "diagnostic" } },
    })).toEqual([{ entity: "lock.back", kind: "lock" }, { entity: "lock.front", kind: "lock", battery: "sensor.front_battery" }]);
    expect(parseFieldConfig({ cards: [{ entity: "lock.front", battery: "sensor.front_battery" }] }).rows?.[0].cards[0].item).toMatchObject({ kind: "lock", battery: "sensor.front_battery" });
    expect(() => parseFieldConfig({ cards: [{ entity: "lock.front", battery: "light.lamp" }] })).toThrow();
  });

  it("takes every door, window, leak and smoke sensor, with the battery on its device, and no other binary sensor", () => {
    expect(autoModules({
      states: {
        "binary_sensor.patio": { attributes: { friendly_name: "Patio door", device_class: "door" } },
        "sensor.patio_battery": { attributes: { friendly_name: "Patio battery", device_class: "battery" } },
        "binary_sensor.sink": { attributes: { friendly_name: "Leak", device_class: "moisture" } },
        "binary_sensor.hall": { attributes: { friendly_name: "Hall motion", device_class: "motion" } },
        "binary_sensor.sock_off": { attributes: { friendly_name: "Sock off" } },
      },
      entities: { "binary_sensor.patio": { device_id: "patio" }, "sensor.patio_battery": { device_id: "patio", entity_category: "diagnostic" } },
    })).toEqual([{ entity: "binary_sensor.sink", kind: "binarySensor" }, { entity: "binary_sensor.patio", kind: "binarySensor", battery: "sensor.patio_battery" }]);
    expect(parseFieldConfig({ cards: [{ entity: "binary_sensor.patio", battery: "sensor.patio_battery" }] }).rows?.[0].cards[0].item).toMatchObject({ kind: "binarySensor", battery: "sensor.patio_battery" });
  });

  it("takes every visible alarm panel", () => {
    expect(autoModules({ states: { "alarm_control_panel.house": state("alarm_control_panel.house", "House alarm") } })).toEqual([{ entity: "alarm_control_panel.house", kind: "alarm" }]);
  });
});

describe("groupByArea", () => {
  it("orders areas by name, keeps each area's own order, and puts modules with no area last", () => {
    const groups = groupByArea([{ entity: "light.z", area: "Office" }, { entity: "light.n" }, { entity: "light.y", area: "Kitchen" }, { entity: "light.x", area: "Office" }]);
    expect(groups.map((g) => [g.area, g.modules.map((m) => m.entity)])).toEqual([
      ["Kitchen", ["light.y"]],
      ["Office", ["light.z", "light.x"]],
      [undefined, ["light.n"]],
    ]);
  });
});

describe("the house's energy", () => {
  const states = {
    "light.lamp": state("light.lamp", "Lamp"),
    "sensor.grid_power": state("sensor.grid_power", "Grid", "power"),
    "sensor.grid_import": state("sensor.grid_import", "Grid import", "energy"),
    "sensor.solar_power": state("sensor.solar_power", "Solar", "power"),
    "sensor.co2": state("sensor.co2", "Air", "carbon_dioxide"),
  };
  const energy = {
    energy_sources: [
      { type: "solar", stat_rate: "sensor.solar_power" },
      { type: "grid", stat_energy_from: "sensor.grid_import", stat_rate: "sensor.grid_power" },
      { type: "water", stat_energy_from: "sensor.co2" },
    ],
  };

  it("takes the preferences' power, then meters, as numeric modules, leaving out what the area rows already draw", () => {
    const input = { states, energy: { energy_sources: [...energy.energy_sources, { type: "grid", stat_energy_to: "sensor.co2" }] } };
    expect(energyModules(input, autoModules(input))).toEqual([
      { entity: "sensor.grid_power", kind: "numeric" },
      { entity: "sensor.solar_power", kind: "numeric" },
      { entity: "sensor.grid_import", kind: "numeric" },
    ]);
    expect(energyModules({ states })).toEqual([]);
    expect(energyModules({ states, energy: { energy_sources: [] } })).toEqual([]);
  });

  it("puts them under Energy, last, after the modules with no area, in their own order and not in their areas' rows", () => {
    const input = { states, energy };
    const place = (m: ModuleConfig): ModuleConfig => ({ ...m, area: m.entity === "light.lamp" ? undefined : m.entity === "sensor.co2" ? "Office" : "Utility" });
    const modules = autoModules(input);
    const rows = areaRows(modules.map(place), energyModules(input, modules).map(place));
    expect(rows.map((row) => [row.title, row.cards.map((card) => card.item.entity)])).toEqual([
      ["Office", ["sensor.co2"]],
      [undefined, ["light.lamp"]],
      ["Energy", ["sensor.grid_power", "sensor.solar_power", "sensor.grid_import"]],
    ]);
    expect(rows.at(-1)!.cards.map((card) => card.item.area)).toEqual(["Utility", "Utility", "Utility"]);
  });

  it("has no Energy row without preferences, and an area called Energy takes them", () => {
    expect(areaRows([{ entity: "light.lamp", kind: "light", area: "Kitchen" }]).map((row) => row.title)).toEqual(["Kitchen"]);
    const rows = areaRows(
      [{ entity: "light.meter", kind: "light", area: "Energy" }, { entity: "light.lamp", kind: "light", area: "Kitchen" }],
      [{ entity: "sensor.grid_power", kind: "numeric" }],
    );
    expect(rows.map((row) => [row.title, row.cards.map((card) => card.item.entity)])).toEqual([
      ["Energy", ["light.meter", "sensor.grid_power"]],
      ["Kitchen", ["light.lamp"]],
    ]);
  });
});

describe("parseFieldConfig", () => {
  it("defaults to automatic modules, Home Assistant's dark mode, standard modules, and alarms that flash", () => {
    expect(parseFieldConfig({ type: "custom:dashhaus-field" })).toEqual({ title: undefined, showTime: false, hourCycle: undefined, finish: "home-assistant", footprint: "standard", quiet: false, stills: true });
  });

  it("takes a camera's still and refresh, and the dashboard's stills", () => {
    const config = parseFieldConfig({ stills: false, cards: [{ entity: "camera.door", still: false, refresh: 30 }, "camera.nursery"] });
    expect(config.stills).toBe(false);
    expect(config.rows?.[0].cards.map((c) => c.item)).toMatchObject([
      { kind: "camera", entity: "camera.door", still: false, stillRefresh: 30 },
      { kind: "camera", entity: "camera.nursery" },
    ]);
    expect(() => parseFieldConfig({ stills: "no" })).toThrow('"stills"');
    expect(() => parseFieldConfig({ cards: [{ entity: "camera.door", refresh: 0 }] })).toThrow('"refresh" must be a whole number from 1 to 3600');
  });

  it("takes a clock for the header, on 12 or 24 hours", () => {
    expect(parseFieldConfig({ show_time: true, hour_cycle: "h23" })).toMatchObject({ showTime: true, hourCycle: "h23" });
    expect(() => parseFieldConfig({ show_time: "yes" })).toThrow('"show_time"');
    expect(() => parseFieldConfig({ hour_cycle: "h24" })).toThrow('"hour_cycle"');
  });

  it("takes quiet, for a panel where an alarm mustn't flash", () => {
    expect(parseFieldConfig({ quiet: true }).quiet).toBe(true);
    expect(() => parseFieldConfig({ quiet: "yes" })).toThrow('"quiet"');
  });

  it("reads supported modules as ids or maps in cards, and reports every problem at once", () => {
    expect(parseFieldConfig({ footprint: "compact", cards: ["light.a", { entity: "light.b", footprint: "compact" }, "climate.hall"] }).rows?.[0].cards.map((entry) => entry.item)).toEqual([
      { entity: "light.a", kind: "light", name: undefined, area: undefined, footprint: undefined },
      { entity: "light.b", kind: "light", name: undefined, area: undefined, footprint: "compact" },
      { entity: "climate.hall", kind: "climate", name: undefined, area: undefined, footprint: undefined },
    ]);
    expect(() => parseFieldConfig({ finish: "blak", cards: [{ name: "x" }] })).toThrow(/did you mean "black"\?[\s\S]*a module needs an "entity"/);
  });

  it("takes a sensor's companions and outdoor flag, on sensors only", () => {
    expect(parseFieldConfig({ cards: [{ entity: "sensor.bed_t", humidity: "sensor.bed_h", battery: "sensor.bed_b", outdoor: true }] }).rows?.[0].cards.map((entry) => entry.item)).toEqual([
      { entity: "sensor.bed_t", kind: "sensor", name: undefined, area: undefined, footprint: undefined, humidity: "sensor.bed_h", battery: "sensor.bed_b", outdoor: true },
    ]);
    expect(() => parseFieldConfig({ cards: [{ entity: "sensor.bed_t", humidity: "light.lamp" }] })).toThrow("light.lamp must be a sensor.* entity");
    expect(() => parseFieldConfig({ cards: [{ entity: "light.lamp", battery: "sensor.b" }] })).toThrow('"battery"');
  });

  it("takes a weather's AQI, sun and forecast settings, the sun by default, on weather only", () => {
    expect(parseFieldConfig({ cards: ["weather.home", { entity: "weather.met", aqi: "sensor.aqi", aqi_scale: "US", sun: null, forecasts: false }] }).rows?.[0].cards.map((entry) => entry.item)).toEqual([
      { entity: "weather.home", kind: "weather", name: undefined, area: undefined, footprint: undefined, aqi: undefined, aqiScale: undefined, sun: "sun.sun", forecasts: true },
      { entity: "weather.met", kind: "weather", name: undefined, area: undefined, footprint: undefined, aqi: "sensor.aqi", aqiScale: "US", sun: undefined, forecasts: false },
    ]);
    expect(() => parseFieldConfig({ cards: [{ entity: "weather.home", sun: "sensor.sun" }] })).toThrow("sensor.sun must be a sun.* entity");
    expect(() => parseFieldConfig({ cards: [{ entity: "light.lamp", aqi: "sensor.aqi" }] })).toThrow('"aqi"');
  });

  it("takes a toggle's icon and description, on toggles only", () => {
    expect(parseFieldConfig({ cards: ["switch.fan", { entity: "input_boolean.dnd", icon: "bell-off", description: "Silences the chimes." }] }).rows?.[0].cards.map((entry) => entry.item)).toEqual([
      { entity: "switch.fan", kind: "toggle", name: undefined, area: undefined, footprint: undefined, icon: undefined, description: undefined, defaulted: true },
      { entity: "input_boolean.dnd", kind: "toggle", name: undefined, area: undefined, footprint: undefined, icon: "bell-off", description: "Silences the chimes." },
    ]);
    expect(() => parseFieldConfig({ cards: [{ entity: "input_boolean.dnd", icon: "bel-off" }] })).toThrow('did you mean "bell-off"?');
    expect(() => parseFieldConfig({ cards: [{ entity: "light.lamp", icon: "moon" }] })).toThrow('"icon"');
  });

  it("draws a switch as a sound with \"card: sound\", taking its volume number, on sounds only", () => {
    expect(parseFieldConfig({ cards: [{ entity: "switch.nursery_music", card: "sound", volume: "number.nursery_volume" }, { entity: "switch.office_noise", card: "sound" }] }).rows?.[0].cards.map((entry) => entry.item)).toEqual([
      { entity: "switch.nursery_music", kind: "sound", name: undefined, area: undefined, footprint: undefined, volume: "number.nursery_volume" },
      { entity: "switch.office_noise", kind: "sound", name: undefined, area: undefined, footprint: undefined, volume: undefined },
    ]);
    expect(() => parseFieldConfig({ cards: [{ entity: "switch.nursery_music", card: "sound", volume: "sensor.volume" }] })).toThrow("sensor.volume must be a number.* entity");
    expect(() => parseFieldConfig({ cards: [{ entity: "switch.fan", volume: "number.fan_volume" }] })).toThrow('"volume"');
  });

  it("takes an alarm's view-only flag, delays and open sensors, on alarms only", () => {
    expect(parseFieldConfig({ cards: [{ entity: "alarm_control_panel.house", read_only: true, exit_delay: 30, entry_delay: 45, open_sensors: ["Back door"] }] }).rows?.[0].cards.map((entry) => entry.item)).toEqual([
      { entity: "alarm_control_panel.house", kind: "alarm", name: undefined, area: undefined, footprint: undefined, readOnly: true, exitDelay: 30, entryDelay: 45, openSensors: ["Back door"] },
    ]);
    expect(() => parseFieldConfig({ cards: [{ entity: "alarm_control_panel.house", open_sensors: "Back door" }] })).toThrow('"open_sensors" must be a list of names');
    expect(() => parseFieldConfig({ cards: [{ entity: "light.lamp", exit_delay: 30 }] })).toThrow('"exit_delay"');
  });

  it("takes an Owlet sock's companions, alert sensors and stale minutes, on socks only", () => {
    expect(parseFieldConfig({ cards: [
      "sensor.owlet_sock_a_sleep_state",
      { entity: "sensor.nova", card: "owlet", heart_rate: "sensor.nova_bpm", oxygen: "sensor.nova_spo2", charging: "binary_sensor.nova_dock", base_station: "switch.nova_base", alerts: { low_oxygen: "binary_sensor.nova_spo2_low" }, stale_after: 5 },
    ] }).rows?.[0].cards.map((entry) => entry.item)).toEqual([
      expect.objectContaining({ entity: "sensor.owlet_sock_a_sleep_state", kind: "owlet", heartRate: undefined, alerts: undefined }),
      { entity: "sensor.nova", kind: "owlet", name: undefined, area: undefined, footprint: undefined, heartRate: "sensor.nova_bpm", oxygen: "sensor.nova_spo2", charging: "binary_sensor.nova_dock", baseStation: "switch.nova_base", alerts: { low_oxygen: "binary_sensor.nova_spo2_low" }, staleAfter: 5 },
    ]);
    expect(() => parseFieldConfig({ cards: [{ entity: "sensor.a_sleep_state", alerts: { low_oxygn: "binary_sensor.a" } }] })).toThrow('did you mean "low_oxygen"?');
    expect(() => parseFieldConfig({ cards: [{ entity: "sensor.a_sleep_state", alerts: ["binary_sensor.a"] }] })).toThrow('"alerts" must map alerts');
    expect(() => parseFieldConfig({ cards: [{ entity: "sensor.bed_t", heart_rate: "sensor.bpm" }] })).toThrow('"heart_rate"');
  });

  it("takes a guest Wi-Fi code's QR code and buttons, on guest Wi-Fi only", () => {
    expect(parseFieldConfig({ cards: [
      "sensor.site_voucher",
      { entity: "sensor.visitors", card: "guestWifi", qr: "image.visitors_qr", new_code: "button.visitors_new", refresh: "button.visitors_fetch" },
    ] }).rows?.[0].cards.map((entry) => entry.item)).toEqual([
      expect.objectContaining({ entity: "sensor.site_voucher", kind: "guestWifi", qr: undefined, newCode: undefined, refresh: undefined }),
      expect.objectContaining({ entity: "sensor.visitors", kind: "guestWifi", qr: "image.visitors_qr", newCode: "button.visitors_new", refresh: "button.visitors_fetch" }),
    ]);
    expect(() => parseFieldConfig({ cards: [{ entity: "sensor.site_voucher", new_code: "switch.new_code" }] })).toThrow("must be a button.* or input_button.* or script.* entity");
    expect(() => parseFieldConfig({ cards: [{ entity: "sensor.bed_t", qr: "image.qr" }] })).toThrow('"qr"');
  });

  it("takes a password in an input_text with card: guestWifi, never by itself", () => {
    expect(parseFieldConfig({ cards: [
      { entity: "input_text.guest_password", card: "guestWifi", access: "password", network: "Maple Guests 5G", new_code: "script.new_guest_password" },
    ] }).rows?.[0].cards.map((entry) => entry.item)).toEqual([
      expect.objectContaining({ entity: "input_text.guest_password", kind: "guestWifi", access: "password", network: "Maple Guests 5G", newCode: "script.new_guest_password" }),
    ]);
    expect(() => parseFieldConfig({ cards: ["input_text.guest_password"] })).toThrow("guestWifi");
    expect(autoModules({ states: { "input_text.guest_password": state("input_text.guest_password", "Guest password") } })).toEqual([]);
  });

  it("takes a card for the entity's domain with \"card\", and no other", () => {
    expect(parseFieldConfig({ cards: [{ entity: "sensor.bed_t", card: "sensor" }] }).rows?.[0].cards[0].item.kind).toBe("sensor");
    expect(() => parseFieldConfig({ cards: [{ entity: "sensor.bed_t", card: "light" }] })).toThrow('"card" must be one of "sensor"');
  });
});

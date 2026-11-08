import type { HaTransport, HassEntities } from "../ha/types";
import type { EnergyPrefs } from "../ha/energy";
import { DEMO_ENERGY_PREFS } from "./messages";
import { createDemoHouseTransport } from "./house";

/*
 * Storybook-only: the demo house in several rooms, for the stories that lay a house out by area (a wall panel's
 * automatic layout, spec/deploy.md → The wall layout). The entities are the demo house's own; only the registries
 * differ, so every other story keeps its one Living room.
 */

/** One device of the house: its area, and the entities on it. */
interface Device { area?: string; entities: readonly string[] }

/** A house's registries, written as a person reads them: its areas, its devices and what Home Assistant hides. */
export interface DemoWallHouse {
  /** Area id → name. */
  areas: Readonly<Record<string, string>>;
  /** Device id → its area and entities; an entity on no device and in no area is in no list. */
  devices: Readonly<Record<string, Device>>;
  /** Entities a person hid, or the integration marks config: left out of every automatic layout. */
  hidden?: readonly string[];
  /** States that differ from the demo house's: the worst case's jammed lock, its open door. */
  states?: Readonly<Record<string, string>>;
}

/** The Owlet sock's sleep state and its companions, one device. */
const OWLET = [
  "sensor.owlet_sock_ac000w0123_sleep_state",
  "sensor.owlet_sock_ac000w0123_heart_rate",
  "sensor.owlet_sock_ac000w0123_o2_saturation",
  "binary_sensor.owlet_sock_ac000w0123_charging",
  "binary_sensor.owlet_sock_ac000w0123_critical_oxygen_alert",
  "binary_sensor.owlet_sock_ac000w0123_low_oxygen_alert",
  "binary_sensor.owlet_sock_ac000w0123_high_oxygen_alert",
  "binary_sensor.owlet_sock_ac000w0123_low_heart_rate_alert",
  "binary_sensor.owlet_sock_ac000w0123_high_heart_rate_alert",
  "binary_sensor.owlet_sock_ac000w0123_sock_off",
  "binary_sensor.owlet_sock_ac000w0123_sock_disconnected_alert",
  "binary_sensor.owlet_sock_ac000w0123_lost_power_alert",
  "binary_sensor.owlet_sock_ac000w0123_critical_battery_alert",
  "binary_sensor.owlet_sock_ac000w0123_low_battery_alert",
  "switch.owlet_sock_ac000w0123_base_station_on",
];

/** What Home Assistant's own dashboard hides too: a base station's switch, a plug's power, the password behind a code. */
const PLUMBING = ["switch.owlet_sock_ac000w0123_base_station_on", "sensor.dishwasher_power", "input_text.guest_wifi_password"];

/**
 * The everyday house: four rooms, the weather and the sun joining Outside, and the house's own alarm, modes, guest
 * Wi-Fi and calendars in no room. The office, the kitchen, the extractor and the vacuums are hidden.
 */
export const DEMO_WALL_HOUSE: DemoWallHouse = {
  areas: { bedroom: "Bedroom", living_room: "Living room", nursery: "Nursery", outside: "Outside" },
  devices: {
    living_light: { area: "living_room", entities: ["light.living_room"] },
    living_thermostat: { area: "living_room", entities: ["climate.living_room"] },
    living_air: { area: "living_room", entities: ["sensor.living_room_temperature", "sensor.living_room_humidity", "sensor.living_room_battery", "sensor.living_room_co2"] },
    living_blinds: { area: "living_room", entities: ["cover.living_room"] },
    living_fan: { area: "living_room", entities: ["fan.living_room_ceiling"] },
    living_tv: { area: "living_room", entities: ["media_player.living_room_tv"] },
    bedroom_humidifier: { area: "bedroom", entities: ["humidifier.bedroom"] },
    bedroom_plug: { area: "bedroom", entities: ["switch.bedroom"] },
    bedroom_fan: { area: "bedroom", entities: ["fan.bedroom"] },
    bedroom_window: { area: "bedroom", entities: ["binary_sensor.bedroom_window"] },
    owlet: { area: "nursery", entities: OWLET },
    nursery_sound: { area: "nursery", entities: ["switch.nursery_music", "number.nursery_volume"] },
    nursery_camera: { area: "nursery", entities: ["camera.nursery"] },
    porch: { area: "outside", entities: ["switch.porch"] },
    front_camera: { area: "outside", entities: ["camera.front_door"] },
    front_lock: { area: "outside", entities: ["lock.front_door", "sensor.front_door_battery"] },
    back_lock: { area: "outside", entities: ["lock.back_door"] },
    patio: { area: "outside", entities: ["binary_sensor.patio_door", "sensor.patio_door_battery"] },
  },
  hidden: [
    ...PLUMBING,
    "humidifier.office",
    "switch.office",
    "fan.bathroom_extractor",
    "media_player.kitchen_speaker",
    "vacuum.robot_vacuum",
    "vacuum.upstairs_vacuum",
    "binary_sensor.kitchen_leak",
    "binary_sensor.hallway_smoke",
  ],
};

/** The worst case's longest area name: a room named in full, as a person may well type it. */
export const DEMO_WALL_LONGEST_AREA = "Upstairs primary bedroom with en-suite and walk-in closet";

/**
 * The worst case: eight rooms, so the areas wrap into further rows; the longest area name; a room with one card
 * (the hallway's smoke alarm); and a jammed lock and an open door in a late room (Outside), past the first screen.
 * The house's own alarm, modes, guest Wi-Fi and calendars, in no room, end the first row. Nothing is hidden.
 */
export const DEMO_WALL_HOUSE_WORST_CASE: DemoWallHouse = {
  areas: {
    ...DEMO_WALL_HOUSE.areas,
    kitchen: "Kitchen",
    hallway: "Hallway",
    office: "Office",
    upstairs: DEMO_WALL_LONGEST_AREA,
  },
  devices: {
    ...DEMO_WALL_HOUSE.devices,
    office_humidifier: { area: "office", entities: ["humidifier.office"] },
    office_plug: { area: "office", entities: ["switch.office"] },
    extractor: { area: "kitchen", entities: ["fan.bathroom_extractor"] },
    speaker: { area: "kitchen", entities: ["media_player.kitchen_speaker"] },
    leak: { area: "kitchen", entities: ["binary_sensor.kitchen_leak"] },
    dishwasher: { area: "kitchen", entities: ["sensor.dishwasher_power"] },
    smoke: { area: "hallway", entities: ["binary_sensor.hallway_smoke"] },
    robot: { area: "living_room", entities: ["vacuum.robot_vacuum"] },
    upstairs_vacuum: { area: "upstairs", entities: ["vacuum.upstairs_vacuum"] },
    upstairs_fan: { area: "upstairs", entities: ["fan.bedroom"] },
    upstairs_humidifier: { area: "upstairs", entities: ["humidifier.bedroom"] },
    upstairs_window: { area: "upstairs", entities: ["binary_sensor.bedroom_window"] },
  },
  hidden: ["switch.owlet_sock_ac000w0123_base_station_on"],
  states: { "lock.back_door": "jammed", "binary_sensor.patio_door": "on" },
};

/** Each entity's device in a house, the last device naming it winning (a worst case moves a few). */
function deviceOf(house: DemoWallHouse): Map<string, string> {
  const devices = new Map<string, string>();
  for (const [id, device] of Object.entries(house.devices)) for (const entity of device.entities) devices.set(entity, id);
  return devices;
}

/** The demo house's entities with a house's own states. */
function withStates(entities: HassEntities, states: DemoWallHouse["states"] = {}): HassEntities {
  const next = { ...entities };
  for (const [id, state] of Object.entries(states)) if (next[id]) next[id] = { ...next[id], state };
  return next;
}

/**
 * The demo house on a house's registries: the same entities and services, `config/entity_registry/list_for_display`,
 * `config/device_registry/list` and `config/area_registry/list` answered from `house`, and its own states.
 */
export function createDemoWallHouseTransport(house: DemoWallHouse = DEMO_WALL_HOUSE): HaTransport {
  const demo = createDemoHouseTransport();
  const devices = deviceOf(house);
  const hidden = new Set(house.hidden ?? []);
  return {
    ...demo,
    subscribeEntities: (listener) => demo.subscribeEntities((entities) => listener(withStates(entities, house.states))),
    sendMessage(type, payload) {
      if (type === "config/area_registry/list") return Promise.resolve(Object.entries(house.areas).map(([area_id, name]) => ({ area_id, name, floor_id: "ground" })));
      if (type === "config/device_registry/list") return Promise.resolve(Object.entries(house.devices).map(([id, device]) => ({ id, area_id: device.area ?? null })));
      if (type === "config/entity_registry/list_for_display") {
        return Promise.resolve({
          entity_categories: {},
          entities: [...new Set([...devices.keys(), ...hidden])].map((ei) => ({
            ei,
            ...(devices.has(ei) && { di: devices.get(ei) }),
            ...(hidden.has(ei) && { hb: true }),
          })),
        });
      }
      return demo.sendMessage!(type, payload);
    },
  };
}

/**
 * What an automatic layout reads of a house (`AutoInput`, `@dashhaus/core/lovelace/layout`), in the frontend's `hass`
 * shape, as `autoInput` gives it: `states` (the store's entities), the house's registries and the demo house's energy
 * preferences. Written out here, since a demo never reaches the Lovelace framework.
 */
export interface DemoWallInput {
  states: Record<string, { attributes: Record<string, unknown> }>;
  entities: Record<string, { device_id?: string; hidden?: boolean }>;
  devices: Record<string, { area_id: string | null }>;
  areas: Record<string, { name: string }>;
  energy: EnergyPrefs;
}

export function demoWallInput(states: DemoWallInput["states"], house: DemoWallHouse = DEMO_WALL_HOUSE): DemoWallInput {
  const devices = deviceOf(house);
  const hidden = new Set(house.hidden ?? []);
  const entities: DemoWallInput["entities"] = {};
  for (const id of Object.keys(states)) {
    const device = devices.get(id);
    if (device || hidden.has(id)) entities[id] = { ...(device && { device_id: device }), ...(hidden.has(id) && { hidden: true }) };
  }
  return {
    states,
    entities,
    devices: Object.fromEntries(Object.entries(house.devices).map(([id, device]) => [id, { area_id: device.area ?? null }])),
    areas: Object.fromEntries(Object.entries(house.areas).map(([id, name]) => [id, { name }])),
    energy: DEMO_ENERGY_PREFS,
  };
}

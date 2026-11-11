/**
 * The sample house: four areas, lights, room sensors, a switch, a thermostat, a front-door lock and the weather.
 *
 * It is the default `states` and `registries` a `FakeHomeAssistant` starts with, in the shapes Home Assistant returns:
 * `houseStates()` is `get_states`, `houseEntityRegistry()` is `config/entity_registry/list_for_display`,
 * `houseDevices()` is `config/device_registry/list`, and `houseRegistries()` is what the frontend's `hass` carries.
 * `startFakeHomeAssistant` accepts your own arrays or registries instead.
 */

const stamp = "2026-10-31T18:00:00Z";

/** A small house: four areas, lights, room sensors, a switch, a thermostat, a front-door lock and the weather. */
export const HOUSE_AREAS = [
  { area_id: "kitchen", name: "Kitchen" },
  { area_id: "living_room", name: "Living room" },
  { area_id: "bedroom", name: "Bedroom" },
  { area_id: "office", name: "Office" },
];

const entity = (entity_id, state, attributes, area_id) => ({ entity_id, state, attributes, area_id });

const HOUSE = [
  entity("light.kitchen_ceiling", "on", { friendly_name: "Kitchen ceiling", supported_color_modes: ["brightness"], color_mode: "brightness", brightness: 230 }, "kitchen"),
  entity("light.kitchen_counter", "off", { friendly_name: "Counter strip", supported_color_modes: ["brightness"], color_mode: null, brightness: null }, "kitchen"),
  entity("sensor.kitchen_temperature", "21.8", { friendly_name: "Kitchen temperature", device_class: "temperature", unit_of_measurement: "°C", state_class: "measurement" }, "kitchen"),
  entity("sensor.kitchen_humidity", "47", { friendly_name: "Kitchen humidity", device_class: "humidity", unit_of_measurement: "%", state_class: "measurement" }, "kitchen"),
  entity("light.living_room_floor", "on", { friendly_name: "Floor lamp", supported_color_modes: ["color_temp"], color_mode: "color_temp", brightness: 140, color_temp_kelvin: 2700, min_color_temp_kelvin: 2200, max_color_temp_kelvin: 6500 }, "living_room"),
  entity("light.living_room_shelf", "off", { friendly_name: "Shelf lights", supported_color_modes: ["onoff"], color_mode: null }, "living_room"),
  entity("sensor.living_room_temperature", "20.6", { friendly_name: "Living room temperature", device_class: "temperature", unit_of_measurement: "°C", state_class: "measurement" }, "living_room"),
  entity("lock.front_door", "locked", { friendly_name: "Front door", supported_features: 0 }, "living_room"),
  entity("climate.living_room", "heat", { friendly_name: "Thermostat", hvac_modes: ["off", "heat"], hvac_action: "heating", current_temperature: 20.6, temperature: 21.5, min_temp: 7, max_temp: 30, target_temp_step: 0.5, supported_features: 1 | 128 | 256 }, "living_room"),
  entity("light.bedroom_bedside", "off", { friendly_name: "Bedside", supported_color_modes: ["brightness"], color_mode: null, brightness: null }, "bedroom"),
  entity("sensor.bedroom_temperature", "19.2", { friendly_name: "Bedroom temperature", device_class: "temperature", unit_of_measurement: "°C", state_class: "measurement" }, "bedroom"),
  entity("sensor.bedroom_humidity", "52", { friendly_name: "Bedroom humidity", device_class: "humidity", unit_of_measurement: "%", state_class: "measurement" }, "bedroom"),
  entity("light.office_desk", "on", { friendly_name: "Desk lamp", supported_color_modes: ["brightness"], color_mode: "brightness", brightness: 180 }, "office"),
  entity("sensor.office_temperature", "unavailable", { friendly_name: "Office temperature", device_class: "temperature", unit_of_measurement: "°C" }, "office"),
  entity("switch.office_fan", "off", { friendly_name: "Desk fan" }, "office"),
  entity("weather.home", "partlycloudy", { friendly_name: "Home", temperature: 9, humidity: 71, wind_speed: 14, temperature_unit: "°C", wind_speed_unit: "km/h" }, null),
];

/** A room's sensors sit on one device, as a climate sensor's do in Home Assistant, so layouts can pair them. */
const deviceOf = ({ entity_id, area_id }) => (entity_id.startsWith("sensor.") && area_id ? `${area_id}_air` : null);

/** The house as `get_states` returns it. */
export function houseStates() {
  return HOUSE.map(({ entity_id, state, attributes }) => ({
    entity_id,
    state,
    attributes: { ...attributes },
    last_changed: stamp,
    last_updated: stamp,
    context: { id: "fake", parent_id: null, user_id: null },
  }));
}

/** The entity registry as `config/entity_registry/list_for_display` returns it. */
export function houseEntityRegistry() {
  return {
    entity_categories: {},
    entities: HOUSE.map((entry) => ({ ei: entry.entity_id, ...(entry.area_id ? { ai: entry.area_id } : {}), ...(deviceOf(entry) ? { di: deviceOf(entry) } : {}) })),
  };
}

/** The device registry as `config/device_registry/list` returns it. */
export function houseDevices() {
  const devices = new Map(HOUSE.filter(deviceOf).map((entry) => [deviceOf(entry), entry.area_id]));
  return [...devices].map(([id, area_id]) => ({ id, area_id, name: id.replaceAll("_", " ") }));
}

/** The registries as the frontend's `hass` carries them. */
export function houseRegistries() {
  return {
    entities: Object.fromEntries(HOUSE.map((entry) => [entry.entity_id, { entity_id: entry.entity_id, area_id: entry.area_id, device_id: deviceOf(entry), hidden: false, entity_category: null }])),
    devices: Object.fromEntries(houseDevices().map((device) => [device.id, device])),
    areas: Object.fromEntries(HOUSE_AREAS.map((area) => [area.area_id, area])),
  };
}

/**
 * The house the preview draws: what Home Assistant would hand the card as `hass`. Add entities here to see more
 * cases (a new domain, a longer name); the worst cases the skin must survive are already in it: a light that is
 * unavailable, a sensor with no reading, a long name and an entity with no area.
 */
export interface PreviewState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

const light = (entity_id: string, name: string, on: boolean, brightness?: number): PreviewState => ({
  entity_id,
  state: on ? "on" : "off",
  attributes: { friendly_name: name, supported_color_modes: ["brightness"], color_mode: on ? "brightness" : null, brightness: on ? brightness ?? 255 : null },
});

const sensor = (entity_id: string, name: string, state: string, device_class: "temperature" | "humidity"): PreviewState => ({
  entity_id,
  state,
  attributes: { friendly_name: name, device_class, unit_of_measurement: device_class === "temperature" ? "°C" : "%", state_class: "measurement" },
});

export const STATES: PreviewState[] = [
  light("light.kitchen_ceiling", "Ceiling", true, 230),
  light("light.kitchen_counter", "Counter strip", false),
  sensor("sensor.kitchen_temperature", "Kitchen temperature", "21.8", "temperature"),
  sensor("sensor.kitchen_humidity", "Kitchen humidity", "47", "humidity"),
  light("light.living_room_floor", "Floor lamp", true, 140),
  light("light.living_room_shelf", "Shelf lights", false),
  sensor("sensor.living_room_temperature", "Living room temperature", "20.6", "temperature"),
  light("light.bedroom_bedside", "Bedside lamp on the window side of the bed", false),
  { entity_id: "light.bedroom_ceiling", state: "unavailable", attributes: { friendly_name: "Bedroom ceiling" } },
  sensor("sensor.bedroom_temperature", "Bedroom temperature", "unavailable", "temperature"),
  light("light.porch", "Porch", true, 90),
];

/** Which area each entity is in, as Home Assistant's entity registry says; an entity left out has none. */
export const AREAS: Record<string, string> = { kitchen: "Kitchen", living_room: "Living room", bedroom: "Bedroom" };

export const ENTITY_AREAS: Record<string, string> = {
  "light.kitchen_ceiling": "kitchen",
  "light.kitchen_counter": "kitchen",
  "sensor.kitchen_temperature": "kitchen",
  "sensor.kitchen_humidity": "kitchen",
  "light.living_room_floor": "living_room",
  "light.living_room_shelf": "living_room",
  "sensor.living_room_temperature": "living_room",
  "light.bedroom_bedside": "bedroom",
  "light.bedroom_ceiling": "bedroom",
  "sensor.bedroom_temperature": "bedroom",
};

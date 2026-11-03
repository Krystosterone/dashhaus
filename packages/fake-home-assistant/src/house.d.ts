/** One area, as Home Assistant's area registry returns it. */
export interface FakeArea {
  area_id: string;
  name: string;
}

/** The context Home Assistant puts on a state. */
export interface FakeContext {
  id: string;
  parent_id: string | null;
  user_id: string | null;
}

/** One state, in `get_states`' shape. `last_changed`, `last_updated` and `context` are filled in when omitted. */
export interface FakeState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
  context?: FakeContext;
}

/** One entry in the frontend's `hass.entities`. */
export interface FakeEntityRegistryEntry {
  entity_id: string;
  area_id?: string | null;
  device_id?: string | null;
  hidden?: boolean;
  entity_category?: string | null;
}

/** One device in `config/device_registry/list` and `hass.devices`. */
export interface FakeDevice {
  id: string;
  area_id?: string | null;
  name: string;
}

/** The registries as the frontend's `hass` carries them. */
export interface FakeRegistries {
  entities: Record<string, FakeEntityRegistryEntry>;
  devices: Record<string, FakeDevice>;
  areas: Record<string, FakeArea>;
}

/** One entity as `config/entity_registry/list_for_display` returns it. */
export interface FakeEntityRegistryDisplayEntry {
  ei: string;
  ai?: string;
  di?: string;
}

/** `config/entity_registry/list_for_display`'s result. */
export interface FakeEntityRegistryDisplay {
  entity_categories: Record<string, never>;
  entities: FakeEntityRegistryDisplayEntry[];
}

/** A small house: four areas, lights, room sensors, a switch, a thermostat, a front-door lock and the weather. */
export const HOUSE_AREAS: FakeArea[];

/** The sample house as `get_states` returns it. */
export function houseStates(): FakeState[];

/** The sample entity registry as `config/entity_registry/list_for_display` returns it. */
export function houseEntityRegistry(): FakeEntityRegistryDisplay;

/** The sample device registry as `config/device_registry/list` returns it. */
export function houseDevices(): FakeDevice[];

/** The sample registries as the frontend's `hass` carries them. */
export function houseRegistries(): FakeRegistries;

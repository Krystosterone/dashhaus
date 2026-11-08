import type { FakeArea, FakeContext, FakeDevice, FakeEntityRegistryDisplay, FakeRegistries, FakeState } from "./house.js";

/** What a driver records through `connectTo`. */
export interface FakeConnectionSeen {
  url?: string;
  token?: string;
}

/** A `call_service` request. */
export interface FakeServiceCall {
  domain: string;
  service: string;
  service_data?: Record<string, unknown>;
  target?: { entity_id?: string | string[] } & Record<string, unknown>;
}

/** A Lovelace resource. */
export interface FakeResource {
  id: string;
  url: string;
  type?: string;
}

/** A dashboard `lovelace/dashboards/create` made. */
export interface FakeDashboard {
  id: string;
  url_path: string;
  title: string;
  icon?: string;
}

/** A saved `lovelace/config`. */
export interface FakeSavedLayout {
  url_path: string;
  config: Record<string, unknown>;
}

/** One command the websocket server received. */
export interface FakeCall {
  type: string;
  payload: Record<string, unknown>;
}

/** What the fake starts with; each defaults to the sample house. */
export interface FakeHomeAssistantOptions {
  states?: FakeState[];
  registries?: FakeRegistries;
  /** What `energy/get_prefs` answers; none, the default, fails it with `not_found` as a house without an energy dashboard. */
  energy?: FakeEnergyPrefs;
}

/** Home Assistant's energy preferences, as `energy/get_prefs` answers them. */
export interface FakeEnergyPrefs {
  energy_sources: Array<{ type: string } & Record<string, unknown>>;
  device_consumption?: unknown[];
  [key: string]: unknown;
}

export class FakeHomeAssistant {
  constructor(options?: FakeHomeAssistantOptions);

  version: string;
  resources: FakeResource[];
  dashboards: FakeDashboard[];
  saved: FakeSavedLayout[];
  calls: FakeCall[];
  closed: boolean;
  /** Make `lovelace/resources` fail, as it does when Home Assistant keeps its resources in YAML. */
  failResources: boolean;
  /** The house's live states by entity id. */
  states: Record<string, FakeState>;
  /** The registries the frontend's `hass` carries. */
  registries: FakeRegistries;
  /** What `energy/get_prefs` answers; none fails it with `not_found`. */
  energy: FakeEnergyPrefs | undefined;

  /** Listen for state changes; the returned function unsubscribes. */
  onStateChange(listener: (state: FakeState) => void): () => void;

  /** The entity registry as `config/entity_registry/list_for_display` returns it. */
  entityRegistryForDisplay(): FakeEntityRegistryDisplay;

  /** The device registry as `config/device_registry/list` returns it. */
  deviceRegistry(): FakeDevice[];

  /** The area registry as `config/area_registry/list` returns it. */
  areaRegistry(): FakeArea[];

  /** Apply a service call to the house. */
  callService(call: FakeServiceCall): { context: FakeContext };

  /** Answer one Home Assistant websocket command. */
  send(type: string, payload?: Record<string, unknown>): Promise<unknown>;

  close(): void;
}

/** Turn a fake into the `connect(url, token)` callback a driver injects; it records the URL and token. */
export function connectTo(
  ha: FakeHomeAssistant,
  seen?: FakeConnectionSeen,
): (url: string, token: string) => Promise<FakeHomeAssistant>;

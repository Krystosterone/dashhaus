export type {
  FakeArea,
  FakeContext,
  FakeDevice,
  FakeEntityRegistryDisplay,
  FakeEntityRegistryDisplayEntry,
  FakeEntityRegistryEntry,
  FakeRegistries,
  FakeState,
} from "./house.js";
export { HOUSE_AREAS, houseDevices, houseEntityRegistry, houseRegistries, houseStates } from "./house.js";

export type {
  FakeCall,
  FakeConnectionSeen,
  FakeDashboard,
  FakeEnergyPrefs,
  FakeHomeAssistantOptions,
  FakeResource,
  FakeSavedLayout,
  FakeServiceCall,
} from "./fake-home-assistant.js";
export { FakeHomeAssistant, connectTo } from "./fake-home-assistant.js";

export type { FakeHomeAssistantServer, FakeHomeAssistantSettings, StartFakeHomeAssistantOptions } from "./server.js";
export { startFakeHomeAssistant } from "./server.js";

/** The package's one entry: the sample house, the fake Home Assistant and the server that serves it. */
export { HOUSE_AREAS, houseDevices, houseEntityRegistry, houseRegistries, houseStates } from "./house.js";
export { FakeHomeAssistant, connectTo } from "./fake-home-assistant.js";
export { startFakeHomeAssistant } from "./server.js";

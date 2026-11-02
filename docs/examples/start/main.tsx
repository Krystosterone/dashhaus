import { createRoot } from "react-dom/client";
import { getAuth } from "home-assistant-js-websocket";
import { HaProvider, createHaStore } from "@dashhaus/core";
import { connectHomeAssistant } from "@dashhaus/core/websocket";
import { App } from "./App";

// Your app owns the login: here, Home Assistant's own OAuth flow through home-assistant-js-websocket.
const auth = await getAuth({ hassUrl: "http://homeassistant.local:8123" });
const transport = await connectHomeAssistant(auth);
const store = createHaStore(transport);

createRoot(document.getElementById("root")!).render(
  <HaProvider store={store}>
    <App />
  </HaProvider>,
);

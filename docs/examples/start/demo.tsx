import { createRoot } from "react-dom/client";
import { HaProvider } from "@dashhaus/core";
import { createDemoStore } from "@dashhaus/core/demo";
import { App } from "./App";

// The demo house behind the real store: no Home Assistant needed, and every action answers.
const store = createDemoStore();

createRoot(document.getElementById("root")!).render(
  <HaProvider store={store}>
    <App />
  </HaProvider>,
);

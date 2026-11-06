// The Home Assistant bundle's entry (config/vite.lovelace.config.ts). The build replaces the placeholder with every
// stylesheet the dashboards import, so the cards ship as one file: custom:dashhaus-orb (orb) and
// custom:dashhaus-field (field); and the custom:dashhaus dashboard and view strategies (strategy.ts), which Home
// Assistant's Add dashboard dialog lists after a Marketplace install. It sits outside src/ because it is the one file
// that ties both skins together; the shared Lovelace code the skins build on stays skin-free.
// new-skin: token css
import "@dashhaus/orb/styles/tokens.css";
import "@dashhaus/field/styles/tokens.css";
import { perfMark } from "@dashhaus/core/perf";
// new-skin: card definitions
import { defineDashhausCard } from "@dashhaus/orb/lovelace/card";
import { defineFieldCard } from "@dashhaus/field/lovelace/card";
import { defineStrategies } from "./strategy";

declare const __DASHHAUS_BUILD__: string;

// Every card gets the bundle's one stylesheet; each skin's classes and tokens carry its own prefix.
const css = "__DASHHAUS_CSS__";
perfMark("bundle:entry");
// new-skin: define cards
defineDashhausCard(css);
defineFieldCard(css);
defineStrategies();
console.info(`Dashhaus ${__DASHHAUS_BUILD__}`);

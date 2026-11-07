// Orb's resource, `orb-dashboard.js`: the one file Home Assistant loads (scripts/build-resources.js, the skin's
// `./resource` export). It carries Orb's stylesheet, its Lovelace card (`custom:dashhaus-orb`, listed in the card
// picker as Orb) and its dashboard strategy (`custom:orb-dashboard`, listed in Add dashboard as Orb). The build replaces
// the placeholder with every stylesheet Orb imports.
import "../styles/tokens.css";
import { perfMark } from "@dashhaus/core/perf";
import { defineSkinStrategy } from "@dashhaus/core/lovelace/skin";
import { defineDashhausCard } from "./card";
import { ORB_STRATEGY } from "./strategy";

declare const __DASHHAUS_BUILD__: string;

const css = "__DASHHAUS_CSS__";
perfMark("resource:entry");
defineDashhausCard(css);
defineSkinStrategy(ORB_STRATEGY);
console.info(`Orb ${__DASHHAUS_BUILD__}`);

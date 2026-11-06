// Field's resource, `field-dashboard.js`: the one file Home Assistant loads (scripts/build-resources.js, the skin's
// `./resource` export). It carries Field's stylesheet, its Lovelace card (`custom:dashhaus-field`, listed in the card
// picker as Field) and its dashboard strategy (`custom:field-dashboard`, listed in Add dashboard as Field). The build
// replaces the placeholder with every stylesheet Field imports.
import "../styles/tokens.css";
import { perfMark } from "@dashhaus/core/perf";
import { defineSkinStrategy } from "@dashhaus/core/lovelace/skin";
import { defineFieldCard } from "./card";
import { FIELD_STRATEGY } from "./strategy";

declare const __DASHHAUS_BUILD__: string;

const css = "__DASHHAUS_CSS__";
perfMark("bundle:entry");
defineFieldCard(css);
defineSkinStrategy(FIELD_STRATEGY);
console.info(`Field ${__DASHHAUS_BUILD__}`);

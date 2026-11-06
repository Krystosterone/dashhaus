// __Section__'s resource, `dashhaus-__skin__.js` (scripts/resources.js, from its entry in scripts/generated-skins.js):
// the one file Home Assistant loads, with __Section__'s stylesheet, its Lovelace card (`custom:dashhaus-__skin__`) and its
// dashboard strategy (`strategy.ts`), which Add dashboard lists as __Section__. The build replaces the placeholder with
// every stylesheet the skin imports.
import "../styles/tokens.css";
import { defineSkinStrategy } from "@dashhaus/core/lovelace/skin";
import { define__Skin__Card } from "./card";
import { __SKIN_CONST___STRATEGY } from "./strategy";

const css = "__DASHHAUS_CSS__";
define__Skin__Card(css);
defineSkinStrategy(__SKIN_CONST___STRATEGY);

// The combined Marketplace install's last file, `dashhaus.js` (scripts/resources.js → COMBINED): both skins' cards,
// custom:dashhaus-orb and custom:dashhaus-field, and the custom:dashhaus dashboard and view strategies (strategy.ts),
// which now tell people Orb and Field install on their own. The build replaces the placeholder with every stylesheet
// the dashboards import. Each skin's own resource is its `lovelace/resource.ts`; this file goes once its last release
// has shipped (spec/release.md → The combined install's sunset).
import "@dashhaus/orb/styles/tokens.css";
import "@dashhaus/field/styles/tokens.css";
import { perfMark } from "@dashhaus/core/perf";
import { defineDashhausCard } from "@dashhaus/orb/lovelace/card";
import { defineFieldCard } from "@dashhaus/field/lovelace/card";
import { STRATEGY_DOCS, defineStrategies } from "./strategy";

declare const __DASHHAUS_BUILD__: string;

// Every card gets the file's one stylesheet; each skin's classes and tokens carry its own prefix.
const css = "__DASHHAUS_CSS__";
perfMark("bundle:entry");
defineDashhausCard(css);
defineFieldCard(css);
defineStrategies();
console.info(`Dashhaus ${__DASHHAUS_BUILD__}: Orb and Field now install on their own, ${STRATEGY_DOCS}`);

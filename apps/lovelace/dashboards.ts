/**
 * The looks the bundle offers, twice: as the `custom:dashhaus` strategy's views (strategy.ts), and as the dashboards
 * the deprecated setup card creates (setup.ts). Both list Orb, Field, then each skin `npm run new-skin` registers in
 * scripts/generated-skins.js, as the deploy config does. The setup card's paths, titles and icons are
 * `dashboard.config.mjs`'s, so a setup-card install and a `dashhaus-deploy` end with the same dashboards
 * (setup.test.ts holds them together).
 */
import { GENERATED_SKINS } from "../../scripts/generated-skins.js";
import type { SetupDashboard } from "./setup";
import type { StrategyLook } from "./strategy";

export const SETUP_DASHBOARDS: readonly SetupDashboard[] = [
  { path: "dashhaus-orb", title: "Home (Orb)", icon: "mdi:home-variant", type: "custom:dashhaus-orb" },
  { path: "dashhaus-field", title: "Home (Field)", icon: "mdi:knob", type: "custom:dashhaus-field" },
  ...GENERATED_SKINS.map(({ id, title, icon }) => ({ path: `dashhaus-${id}`, title, icon, type: `custom:dashhaus-${id}` })),
];

/**
 * The strategy's looks, in the dashboard's tab order. Orb and Field take the strategy's `viewing` and their own theme
 * key; a generated skin's card takes neither yet, so it gets only the title.
 */
export const STRATEGY_LOOKS: readonly StrategyLook[] = [
  { id: "orb", name: "Orb", type: "custom:dashhaus-orb", passes: ["viewing", "theme"] },
  { id: "field", name: "Field", type: "custom:dashhaus-field", passes: ["viewing", "finish"] },
  // A generated skin's sidebar title is "Home (<Name>)"; its tab is the name.
  ...GENERATED_SKINS.map(({ id, title }) => ({ id, name: title.replace(/^Home \((.+)\)$/, "$1"), type: `custom:dashhaus-${id}`, passes: [] })),
];

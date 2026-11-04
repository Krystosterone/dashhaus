/**
 * The dashboards the bundle's setup card offers to create: the same paths, titles and icons as `dashboard.config.mjs`,
 * so a Marketplace install and a `dashhaus-deploy` end with the same dashboards (setup.test.ts holds them together).
 * A skin `npm run new-skin` registers in scripts/generated-skins.js is offered too, as the deploy config offers it.
 */
import { GENERATED_SKINS } from "../../scripts/generated-skins.js";
import type { SetupDashboard } from "./setup";

export const SETUP_DASHBOARDS: readonly SetupDashboard[] = [
  { path: "dashhaus-orb", title: "Home (Orb)", icon: "mdi:home-variant", type: "custom:dashhaus-orb" },
  { path: "dashhaus-field", title: "Home (Field)", icon: "mdi:knob", type: "custom:dashhaus-field" },
  ...GENERATED_SKINS.map(({ id, title, icon }) => ({ path: `dashhaus-${id}`, title, icon, type: `custom:dashhaus-${id}` })),
];

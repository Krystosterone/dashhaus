// The Home Assistant bundle's entry (config/vite.lovelace.config.ts). The build replaces the placeholder with every
// stylesheet the dashboards import, so the cards ship as one file: custom:home-dashboard (orb) and
// custom:home-dashboard-field (field). It sits outside src/ because it is the one file that ties both skins
// together; the shared Lovelace code the skins build on stays skin-free.
// new-skin: token css
import "../../src/skins/orb/styles/tokens.css";
import "../../src/skins/field/styles/tokens.css";
// new-skin: card definitions
import { defineHomeDashboardCard } from "../../src/skins/orb/lovelace/card";
import { defineFieldCard } from "../../src/skins/field/lovelace/card";

declare const __HOME_DASHBOARD_BUILD__: string;

// Every card gets the bundle's one stylesheet; each skin's classes and tokens carry its own prefix.
const css = "__HOME_DASHBOARD_CSS__";
// new-skin: define cards
defineHomeDashboardCard(css);
defineFieldCard(css);
console.info(`Home Dashboard ${__HOME_DASHBOARD_BUILD__}`);

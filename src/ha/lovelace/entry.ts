// The Home Assistant bundle's entry (vite.lovelace.config.ts). The build replaces the placeholder with every
// stylesheet the dashboards import, so the cards ship as one file: custom:home-dashboard (orb) and
// custom:home-dashboard-field (field).
import "../../skins/orb/styles/tokens.css";
import "../../skins/field/styles/tokens.css";
import { defineHomeDashboardCard } from "../../skins/orb/lovelace/card";
import { defineFieldCard } from "../../skins/field/lovelace/card";

declare const __HOME_DASHBOARD_BUILD__: string;

// Every card gets the bundle's one stylesheet; each skin's classes and tokens carry its own prefix.
const css = "__HOME_DASHBOARD_CSS__";
defineHomeDashboardCard(css);
defineFieldCard(css);
console.info(`Home Dashboard ${__HOME_DASHBOARD_BUILD__}`);

// The Home Assistant bundle's entry (vite.lovelace.config.ts). The build replaces the placeholder with every
// stylesheet the dashboard imports, so the card ships as one file.
import "../../skins/orb/styles/tokens.css";
import { defineHomeDashboardCard } from "../../skins/orb/lovelace/card";

declare const __HOME_DASHBOARD_BUILD__: string;

defineHomeDashboardCard("__HOME_DASHBOARD_CSS__");
console.info(`Home Dashboard ${__HOME_DASHBOARD_BUILD__}`);

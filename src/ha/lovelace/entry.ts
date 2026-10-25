// The Home Assistant bundle's entry (vite.lovelace.config.ts). The build replaces the placeholder with every
// stylesheet the dashboard imports, so the card ships as one file.
import "../../styles/tokens.css";
import { defineHomeDashboardCard } from "./card";
import { defineGlassCard } from "./glass/card";

declare const __HOME_DASHBOARD_BUILD__: string;

// One stylesheet for both cards: the build inlines it once, here, so each placeholder use must share it.
const css = "__HOME_DASHBOARD_CSS__";
defineHomeDashboardCard(css);
defineGlassCard(css);
console.info(`Home Dashboard ${__HOME_DASHBOARD_BUILD__}`);

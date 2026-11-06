// Orb's own bundle (config/vite.lovelace.config.ts, scripts/build-bundle.js): orb-dashboard.js, which the
// Krystosterone/orb-dashboard Marketplace repository releases (hacs/orb-dashboard/). Orb alone: its stylesheet, its
// Lovelace card, custom:dashhaus-orb, listed as Orb, and its custom:orb-dashboard strategy, which Add dashboard lists as
// Orb (skins.ts). The combined bundle, entry.ts, carries every skin.
import "@dashhaus/orb/styles/tokens.css";
import { perfMark } from "@dashhaus/core/perf";
import { CARD_TYPE, defineDashhausCard } from "@dashhaus/orb/lovelace/card";
import { defineSkin, skinRepository } from "./skins";

declare const __DASHHAUS_BUILD__: string;

const css = "__DASHHAUS_CSS__";
perfMark("bundle:entry");
defineSkin(skinRepository("orb"), CARD_TYPE, () => defineDashhausCard(css));
console.info(`Orb ${__DASHHAUS_BUILD__}`);

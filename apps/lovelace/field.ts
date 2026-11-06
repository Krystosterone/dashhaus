// Field's own bundle (config/vite.lovelace.config.ts, scripts/build-bundle.js): field-dashboard.js, which the
// Krystosterone/field-dashboard Marketplace repository releases (hacs/field-dashboard/). Field alone: its stylesheet,
// its Lovelace card, custom:dashhaus-field, listed as Field, and its custom:field-dashboard strategy, which Add
// dashboard lists as Field (skins.ts). The combined bundle, entry.ts, carries every skin.
import "@dashhaus/field/styles/tokens.css";
import { perfMark } from "@dashhaus/core/perf";
import { FIELD_CARD_TYPE, defineFieldCard } from "@dashhaus/field/lovelace/card";
import { defineSkin, skinRepository } from "./skins";

declare const __DASHHAUS_BUILD__: string;

const css = "__DASHHAUS_CSS__";
perfMark("bundle:entry");
defineSkin(skinRepository("field"), FIELD_CARD_TYPE, () => defineFieldCard(css));
console.info(`Field ${__DASHHAUS_BUILD__}`);

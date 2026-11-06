/**
 * The looks the bundle's `custom:dashhaus` strategy offers (strategy.ts), in its tab order: Orb, Field, then each skin
 * `npm run new-skin` registers in scripts/generated-skins.js, as the deploy config does.
 */
import { GENERATED_SKINS } from "../../scripts/generated-skins.js";
import type { StrategyLook } from "./strategy";

/**
 * The strategy's looks. Orb and Field take the strategy's `viewing` and their own theme key; a generated skin's card
 * takes neither yet, so it gets only the title.
 */
export const STRATEGY_LOOKS: readonly StrategyLook[] = [
  { id: "orb", name: "Orb", type: "custom:dashhaus-orb", passes: ["viewing", "theme"] },
  { id: "field", name: "Field", type: "custom:dashhaus-field", passes: ["viewing", "finish"] },
  // A generated skin's sidebar title is "Home (<Name>)"; its tab is the name.
  ...GENERATED_SKINS.map(({ id, title }) => ({ id, name: title.replace(/^Home \((.+)\)$/, "$1"), type: `custom:dashhaus-${id}`, passes: [] })),
];

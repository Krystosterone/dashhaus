/**
 * The looks the combined install's `custom:dashhaus` strategy offers (strategy.ts), in its tab order: Orb, then Field.
 * A skin `npm run new-skin` makes ships its own resource and strategy instead (scripts/resources.js).
 */
import type { StrategyLook } from "./strategy";

/** The strategy's looks: each takes the strategy's `viewing` and its own theme key. */
export const STRATEGY_LOOKS: readonly StrategyLook[] = [
  { id: "orb", name: "Orb", type: "custom:dashhaus-orb", passes: ["viewing", "theme"] },
  { id: "field", name: "Field", type: "custom:dashhaus-field", passes: ["viewing", "finish"] },
];

/**
 * The frozen skin-author surface of `@dashhaus/dashboard`: the custom-element base a skin's Lovelace card extends,
 * the card-picker registration, the token scoping and the automatic layout's `hass` input. A skin imports this
 * subpath, not the whole framework, and may rely on these names. Nav, layout and internals stay outside it.
 */
export { LovelaceDashboardElement, autoInput, registerCard } from "./element";
export type { AutoEntityEntry, LovelaceHass } from "./element";
export { scopeToHost } from "./styles";

/**
 * The frozen skin-author surface of `@dashhaus/core/lovelace`: the custom-element base a skin's Lovelace card extends,
 * the card-picker registration, the token scoping, the automatic layout's `hass` input and the rejected-command
 * status a skin's page shows. A skin imports this subpath, not the whole framework, and may rely on these names. Nav,
 * layout and internals stay outside it.
 */
export { LovelaceDashboardElement, autoInput, registerCard } from "./element";
export type { AutoEntityEntry, LovelaceHass } from "./element";
export { scopeToHost } from "./styles";
export { useActionStatus } from "./useActionStatus";
export type { ActionStatus } from "./useActionStatus";
export type { ActionMessage } from "./actionMessage";

/**
 * @dashhaus/dashboard's public interface, for every skin's Lovelace card: the custom-element base, the nav, the
 * room-sensor layout, the token scoping, and the rejected-command words with the hook a skin's recovery row reads. The YAML reader and the card schema are
 * their own entry, `./schema`, so a Node config can import them without React. It imports @dashhaus/core, never a skin.
 */
export * from "./actionMessage";
export * from "./element";
export * from "./nav";
export * from "./rooms";
export * from "./styles";
export * from "./useActionStatus";
export * from "./useDashboardNav";
export { DashboardConfigError, isRaw, oneOf, Reader, suggest } from "./schema";
export type { Raw } from "./schema";

/**
 * The shared Lovelace slice's public interface, for the future dashboard and every skin's card: the custom-element
 * base, the YAML reader, the nav, the room-sensor layout, the token scoping and the rejected-command words. It
 * imports @scope/core, never a skin.
 */
export * from "./actionMessage";
export * from "./element";
export * from "./nav";
export * from "./rooms";
export * from "./styles";
export * from "./useDashboardNav";
export * from "./yaml";

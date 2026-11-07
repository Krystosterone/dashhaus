import type { ToggleEntity } from "./types";

/** Its state in words, the same on every card and in every skin: On, Off, or Unavailable while it is. */
export const toggleWord = (e: Pick<ToggleEntity, "state">) => (e.state === "unavailable" ? "Unavailable" : e.state === "on" ? "On" : "Off");

/** What it is, in small print after when: a `switch.*` is a Switch, an `input_boolean.*` a Toggle helper. */
export const toggleKind = (e: Pick<ToggleEntity, "entityId">) => (e.entityId.startsWith("switch.") ? "Switch" : "Toggle helper");

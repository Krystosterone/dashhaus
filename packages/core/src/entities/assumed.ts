/**
 * An entity whose state Home Assistant can't vouch for: one it only assumes (`assumed_state`: an RF or IR device it
 * sends commands to but never hears back from, an optimistic MQTT or template entity), or one that is reachable but
 * hasn't said yet (`unknown`). What it shows may be wrong, so a press that flips it may do the opposite of what was
 * meant, and Home Assistant's own controls offer on and off apart. Each skin draws both in its details, in these words.
 */
export interface Unsure {
  state: string;
  assumedState?: boolean;
}

/** Whether to offer both presses: its state is assumed, or unknown. Never while unavailable. */
export const eitherWay = (e: Unsure): boolean => e.state !== "unavailable" && (e.assumedState === true || e.state === "unknown");

/** Why both are there, under them: "Home Assistant assumes its state, so both are here." */
export const eitherWayHint = (e: Unsure): string =>
  e.state === "unknown" ? "Its state isn't known yet, so both are here." : "Home Assistant assumes its state, so both are here.";

/** The two presses' legend and words, off first as every on/off choice is. */
export const EITHER_WAY_LEGEND = "Turn";
export const EITHER_WAY = [{ value: "off", label: "Off" }, { value: "on", label: "On" }] as const;

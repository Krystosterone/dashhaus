import { leftOpenSentence, leftOpenText } from "../cover/words";
import { WARNING_WORD_MAX } from "../severity";
import type { BinarySensorClass, BinarySensorEntity } from "./types";

/**
 * What a binary sensor's state says, in its device class's words, the same on every card and in every skin: a door
 * `on` is Open, a leak sensor's Wet, a smoke detector's Smoke. `today` is the state as `todaySummary` takes it, lower
 * case ("Open 42m", "Not open today"; a detector's "Detected 3m"). Drawn from Home Assistant's own device
 * class states, with a detection said as what it found where one word does (Smoke, Gas, Motion) rather than
 * "Detected", since the card's readout stands alone.
 */
export interface BinarySensorWords {
  on: string;
  off: string;
  today: string;
}

const detects = (on: string): BinarySensorWords => ({ on, off: "Clear", today: "detected" });

export const BINARY_SENSOR_WORDS: Record<BinarySensorClass, BinarySensorWords> = {
  battery: { on: "Low", off: "Normal", today: "low" },
  battery_charging: { on: "Charging", off: "Not charging", today: "charging" },
  carbon_monoxide: detects("CO"),
  cold: { on: "Cold", off: "Normal", today: "cold" },
  connectivity: { on: "Connected", off: "Disconnected", today: "connected" },
  door: { on: "Open", off: "Closed", today: "open" },
  garage_door: { on: "Open", off: "Closed", today: "open" },
  gas: detects("Gas"),
  heat: { on: "Hot", off: "Normal", today: "hot" },
  light: { on: "Light", off: "Dark", today: "detected" },
  lock: { on: "Unlocked", off: "Locked", today: "unlocked" },
  moisture: { on: "Wet", off: "Dry", today: "wet" },
  motion: detects("Motion"),
  moving: { on: "Moving", off: "Still", today: "moving" },
  occupancy: { on: "Occupied", off: "Clear", today: "occupied" },
  opening: { on: "Open", off: "Closed", today: "open" },
  plug: { on: "Plugged in", off: "Unplugged", today: "plugged in" },
  power: { on: "Power", off: "No power", today: "powered" },
  presence: { on: "Home", off: "Away", today: "home" },
  problem: { on: "Problem", off: "OK", today: "faulty" },
  running: { on: "Running", off: "Not running", today: "running" },
  safety: { on: "Unsafe", off: "Safe", today: "unsafe" },
  smoke: detects("Smoke"),
  sound: detects("Sound"),
  tamper: { on: "Tampered", off: "Clear", today: "tampered" },
  update: { on: "Update", off: "Up to date", today: "pending" },
  vibration: detects("Vibration"),
  window: { on: "Open", off: "Closed", today: "open" },
};

/** A plain on/off sensor, with no device class. */
export const PLAIN_WORDS: BinarySensorWords = { on: "On", off: "Off", today: "on" };

export const isBinarySensorClass = (value: unknown): value is BinarySensorClass =>
  typeof value === "string" && Object.hasOwn(BINARY_SENSOR_WORDS, value);

/**
 * What a class's warning says while it is on, where its `on` is one (`severity.ts`): the words a status line or a row
 * leads with, behind the warning marker, so the warning reads with colour removed. Each is 13 characters at most, so
 * it stays whole on a narrow row; `ALERT_SPOKEN` is the whole sentence a screen reader says. A garage door left open
 * says Open, and `alertText` adds since when, as the cover card's does.
 */
export const ALERT_WORDS: Partial<Record<BinarySensorClass, string>> = {
  smoke: "Smoke alarm",
  gas: "Gas alarm",
  carbon_monoxide: "CO alarm",
  moisture: "Leak detected",
  heat: "Too hot",
  safety: "Unsafe",
  tamper: "Tampered",
  problem: "Problem",
  cold: "Too cold",
  battery: "Battery low",
  garage_door: "Open",
};

/** The longest a warning's words may be (`ALERT_WORDS`): every card's `WARNING_WORD_MAX`. */
export const ALERT_WORD_MAX = WARNING_WORD_MAX;

/** A class's warning said in full, for a screen reader: "Carbon monoxide detected". */
export const ALERT_SPOKEN: Partial<Record<BinarySensorClass, string>> = {
  smoke: "Smoke detected",
  gas: "Gas detected",
  carbon_monoxide: "Carbon monoxide detected",
  moisture: "Leak detected",
  heat: "Too hot",
  safety: "Unsafe",
  tamper: "Tampering detected",
  problem: "Problem reported",
  cold: "Too cold",
  battery: "Battery low",
  garage_door: "Open",
};

/** Its state's warning in words while it is on and its class has one: "Smoke alarm", "Leak detected". */
export const alertWord = (e: Pick<BinarySensorEntity, "state" | "deviceClass">): string | undefined =>
  e.state === "on" && e.deviceClass ? ALERT_WORDS[e.deviceClass] : undefined;

/** Classes whose warning is about how long it has lasted, so it says since when: a garage door left open. */
const SINCE_ALERTS: ReadonlySet<BinarySensorClass> = new Set(["garage_door"]);

/**
 * Its warning as a card prints it: the alert word, and since when where the warning is about how long it has lasted
 * ("Open since 18:30", as the cover card says a garage door left open). Else `alertWord`.
 */
export function alertText(e: Pick<BinarySensorEntity, "state" | "deviceClass" | "lastChanged">): string | undefined {
  const word = alertWord(e);
  return word && e.deviceClass && SINCE_ALERTS.has(e.deviceClass) ? leftOpenText(e.lastChanged) : word;
}

/**
 * Its warning as a sentence, for a screen reader: "Carbon monoxide detected at Bedroom", "Garage door has been open
 * since 18:30". Undefined while there is none.
 */
export function alertSentence(e: Pick<BinarySensorEntity, "state" | "deviceClass" | "lastChanged" | "name">): string | undefined {
  if (!alertWord(e) || !e.deviceClass) return undefined;
  if (SINCE_ALERTS.has(e.deviceClass)) return leftOpenSentence(e.name, e.lastChanged);
  return `${ALERT_SPOKEN[e.deviceClass]} at ${e.name}`;
}

/** Its device class's words, or plain On and Off. */
export const wordsOf = (deviceClass?: BinarySensorClass): BinarySensorWords => (deviceClass ? BINARY_SENSOR_WORDS[deviceClass] : PLAIN_WORDS);

/** Its state in its device class's words: "Open", "Dry", "Smoke"; "Unavailable" while it is. */
export function stateWord(e: Pick<BinarySensorEntity, "state" | "deviceClass">): string {
  if (e.state === "unavailable") return "Unavailable";
  const words = wordsOf(e.deviceClass);
  return e.state === "on" ? words.on : words.off;
}

/**
 * Which picture names it, so a column of them tells a door from a leak sensor: each skin draws its own. Doors,
 * garage doors, openings and lock sensors are a door; a detector of smoke, gas, carbon monoxide or heat a smoke
 * detector; motion, occupancy, presence, movement, vibration and sound a motion sensor; anything else the plain sensor.
 */
export type BinarySensorPicture = "door" | "window" | "leak" | "smoke" | "motion" | "sensor";

const PICTURE: Partial<Record<BinarySensorClass, BinarySensorPicture>> = {
  door: "door", garage_door: "door", opening: "door", lock: "door",
  window: "window",
  moisture: "leak",
  smoke: "smoke", gas: "smoke", carbon_monoxide: "smoke", heat: "smoke",
  motion: "motion", occupancy: "motion", presence: "motion", moving: "motion", vibration: "motion", sound: "motion",
};

export const pictureOf = (deviceClass?: BinarySensorClass): BinarySensorPicture => (deviceClass && PICTURE[deviceClass]) || "sensor";

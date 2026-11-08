/**
 * The facts a card prints in small print, in the same words on every card and in every skin: when an unavailable
 * entity was last seen, since when it has been as it is, when it last changed and by whom, when it last reported.
 * Times arrive formatted (an entity's `lastSeen`, `lastChanged`, `lastUpdated`); these only put them in words.
 */

/** An unavailable entity's fact: "Last seen 10:42", or "Last seen unknown". */
export const lastSeenFact = (lastSeen?: string) => `Last seen ${lastSeen ?? "unknown"}`;

/** Today's summary for an unavailable entity: "Unavailable since 10:42", or "Unavailable since earlier". */
export const unavailableSince = (lastSeen?: string) => `Unavailable since ${lastSeen ?? "earlier"}`;

/** Since when it has been as it is: "Since 10:42", or nothing. */
export const sinceFact = (time?: string) => (time ? `Since ${time}` : undefined);

/** When it last changed, and by whom where it says: "Last changed 10:58 by Keypad", or "" when it doesn't say. */
export const lastChangedFact = (lastChanged?: string, by?: string) => (lastChanged ? `Last changed ${lastChanged}${by ? ` by ${by}` : ""}` : "");

/** When it last reported: "Updated 10:42", "Live · updated 10:42", or "" when it doesn't say. */
export const updatedFact = (lastUpdated?: string, live?: boolean) => (lastUpdated ? `${live ? "Live · updated" : "Updated"} ${lastUpdated}` : "");

/**
 * A figure a device declares (its supported features, colour modes or attributes include it) but hasn't sent yet: the
 * same words every reading says before its first value (spec/cards.md → What every card says).
 */
export const NO_READING_YET = "No reading yet";

/**
 * A figure a device doesn't declare, so it may never report it (a light with no colour temperature mode, a humidifier
 * with no current humidity): a card draws nothing for it, and says this only where a fixed place must still hold
 * something (Field's segment screen).
 */
export const NOT_REPORTED = "Not reported";

/** A reading as it is now, beside a target it is held to: "20.4° now", "38% now". */
export const nowText = (figure: string) => `${figure} now`;

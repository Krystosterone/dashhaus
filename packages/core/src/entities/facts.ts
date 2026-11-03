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

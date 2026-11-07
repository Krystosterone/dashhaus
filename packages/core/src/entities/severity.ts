/**
 * How much a card's warning may claim on a dashboard, so that one look tells a door left open from a baby's oxygen
 * alarm: **advisory**, look when convenient (a low battery, a door left open); **urgent**, act soon, something has
 * stopped working or is about to (a sock off, an entry delay); **alarm**, act now, safety (a vitals alert, a triggered
 * alarm). A note, a choice rather than a fault (a base station switched off), is no severity. Each card ranks its own
 * warnings; each skin draws the levels its own way.
 */
export type Severity = "advisory" | "urgent" | "alarm";

/**
 * The longest a warning's words may be, on every card: what a 340 px Field row's warning line and an Orb compact row
 * hold whole (spec/cards.md → a warning's words fit a row). What may follow the word (since when, a count, a sensor's
 * name) clips before it does; the spoken label says the whole sentence.
 */
export const WARNING_WORD_MAX = 13;

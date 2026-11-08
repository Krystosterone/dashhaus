import { timeOfDay } from "../entities/clock";
import type { HourCycle } from "../entities/clock";

/** A seed's time as it writes it: "11:52", "Fri 18:30", "Mon 06:12" (24 hours, the day when it isn't today's). */
const SEED_TIME = /^(?:([A-Z][a-z]{2}) )?(\d{2}):(\d{2})$/;

/**
 * Every seed is written as a mapper writes its times on a 24-hour dashboard ("11:52", "Fri 18:30"). This is the same
 * seed as the mapper writes it on `hourCycle`'s ("11:52 AM", "Fri 6:30 PM"), every time in it said by core's
 * `timeOfDay`, so a story shows a card on a 12-hour clock without a second copy of its data. Anything that isn't a
 * seed's time (a name, a figure, a URL) is left as it is.
 */
export function onHourCycle<T>(seed: T, hourCycle: HourCycle): T {
  if (typeof seed === "string") {
    const m = SEED_TIME.exec(seed);
    if (!m) return seed;
    const time = timeOfDay(Number(m[2]), Number(m[3]), hourCycle);
    return (m[1] ? `${m[1]} ${time}` : time) as T;
  }
  if (Array.isArray(seed)) return seed.map((item) => onHourCycle(item, hourCycle)) as T;
  if (seed && typeof seed === "object" && Object.getPrototypeOf(seed) === Object.prototype) {
    return Object.fromEntries(Object.entries(seed).map(([key, value]) => [key, onHourCycle(value, hourCycle)])) as T;
  }
  return seed;
}

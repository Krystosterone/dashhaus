import type { Severity } from "../severity";
import type { WeatherEntity } from "./types";
import { weatherWarnings } from "./readings";

/**
 * How much the weather's warnings may claim (`../severity.ts`): poor air, strong gusts or a high UV index are
 * **advisory**, look when convenient, for the household to act on outside. Nothing while unavailable.
 */
export function weatherSeverity(e: WeatherEntity): Severity | undefined {
  return weatherWarnings(e).length ? "advisory" : undefined;
}

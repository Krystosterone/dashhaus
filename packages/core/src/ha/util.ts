/** Small guards shared by the integration's parsers, mappers and store. */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const finiteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/** A non-empty string, so an empty `friendly_name` falls back like a missing one. */
export const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

export const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/** An entity's choices (modes, presets): its distinct non-empty strings in order, or nothing when it offers none. */
export function distinctStrings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))];
  return values.length ? values : undefined;
}

/** A temperature unit as Home Assistant or an integration writes it (`°C`, `C`, `℃`, `celsius`, any case), or nothing. */
export function temperatureUnit(value: unknown): "°C" | "°F" | undefined {
  if (typeof value !== "string") return undefined;
  const unit = value.trim();
  if (unit === "℉" || /^(?:°?f|fahrenheit)$/i.test(unit)) return "°F";
  if (unit === "℃" || /^(?:°?c|celsius)$/i.test(unit)) return "°C";
  return undefined;
}

/** Read one property of an unknown value without letting a throwing getter escape. */
export function safeProperty(value: unknown, key: string): unknown {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") return undefined;
  try {
    return (value as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

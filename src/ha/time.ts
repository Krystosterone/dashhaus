/**
 * Parse an ISO timestamp from an entity state or attribute, rejecting impossible calendar dates and,
 * for timezone-less values, local times that don't exist (a DST gap).
 */
export function parseHaTime(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] == null ? 0 : Number(match[6]);
  const zone = match[7];
  const offset = !zone || zone === "Z" ? undefined : [Number(zone.slice(1, 3)), Number(zone.slice(4, 6))];
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (
    calendar.getUTCFullYear() !== year
    || calendar.getUTCMonth() !== month - 1
    || calendar.getUTCDate() !== day
    || hour > 23
    || minute > 59
    || second > 59
    || offset && (offset[0] > 23 || offset[1] > 59)
  ) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (!zone && (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
    || date.getHours() !== hour
    || date.getMinutes() !== minute
    || date.getSeconds() !== second
  )) return undefined;
  return date;
}

/**
 * Keep the display formatting at the adapter boundary; cards receive a short local string that
 * says when, relative to `now`: "14:32" today, "Tue 14:32" within the last week, "3 Oct" before that.
 */
export function formatHaTime(value: unknown, now: Date = new Date()) {
  const date = parseHaTime(value);
  if (!date) return undefined;
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= today) return time;
  const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  if (date >= weekAgo) return `${date.toLocaleDateString([], { weekday: "short" })} ${time}`;
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

/** The header's greeting for a local time: morning from 5, afternoon from 12, evening from 17 until 5. */
export function greeting(now: Date, name?: string): string {
  const hour = now.getHours();
  const part = hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 17 ? "afternoon" : "evening";
  const who = name?.trim();
  return who ? `Good ${part}, ${who}` : `Good ${part}`;
}

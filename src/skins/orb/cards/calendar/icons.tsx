/**
 * The domain icon, every compact row's identity (row-identity skill): a calendar page with its two rings. It stays
 * one shape whatever the calendar holds; its day's mark is filled while an event is under way, so the shape says it
 * without colour.
 */
export function CalendarIcon({ now = false }: { now?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor">
      <rect x="3.5" y="4.5" width="13" height="12" rx="2" />
      <path d="M3.5 8.5h13M7 3v3M13 3v3" />
      <rect x="6.5" y="11" width="3" height="2.6" rx="0.6" fill={now ? "currentColor" : "none"} />
    </svg>
  );
}

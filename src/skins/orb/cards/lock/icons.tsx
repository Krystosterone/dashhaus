/**
 * The domain icon: a padlock, every compact row's identity (row-identity skill). Its shackle says the state without
 * colour: shut while locked or locking, lifted while unlocked or open; jammed adds the warn mark in the body.
 */
export function LockIcon({ open = false, alert = false }: { open?: boolean; alert?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor">
      <rect x="4.5" y="9" width="11" height="8" rx="2" />
      <path d={open ? "M7 9V6.2a3 3 0 0 1 5.9-.8" : "M7 9V6.5a3 3 0 0 1 6 0V9"} />
      {alert ? <path d="M10 11v2.6M10 15.4h.01" /> : <path d="M10 12.2v1.8" />}
    </svg>
  );
}

/** The door, for the sheet's Open action: a door ajar. */
export function DoorIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor">
      <path d="M5 17V3.5h10V17M3.5 17h13" />
      <path d="M5 3.5l6 1.6V17" />
      <path d="M9.2 10.5h.01" />
    </svg>
  );
}

/** The lock's glyph: a padlock, open while unlocked. */
export function IconLock({ open = false }: { open?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d={open ? "M8.5 10.5V7a3.5 3.5 0 0 1 6.8-1.2" : "M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5"} /><path d="M12 14.5v2.5" /></svg>;
}

/** The big shield the lock's face glows with. */
export function IconShield({ open = false }: { open?: boolean }) {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M24 4 9 10v10c0 9.8 6.3 18 15 22 8.7-4 15-12.2 15-22V10Z" />{open ? <path d="M18 24h12" /> : <path d="m17.5 24.5 4.5 4.5 8.5-9" />}</svg>;
}

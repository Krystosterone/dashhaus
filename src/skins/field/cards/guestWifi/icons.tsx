/** Wi-Fi's three arcs over its dot: the glyph on the module's flat plate (24 x 24, stroked). */
export function IconGuestWifi() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.2 9.6a12.4 12.4 0 0 1 17.6 0" />
      <path d="M6.4 12.9a7.9 7.9 0 0 1 11.2 0" />
      <path d="M9.5 16.2a3.5 3.5 0 0 1 5 0" />
      <circle cx="12" cy="19.2" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Fetch the codes again: a circling arrow (24 x 24, stroked). */
export function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.5 9.5A7 7 0 1 0 19 14" />
      <path d="M19 5v4.6h-4.6" />
    </svg>
  );
}

/** Make a new code: a plus (24 x 24, stroked). */
export function IconNewCode() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}

/** The glyph as solid bands for the screen's pictogram (20 x 26): the dot and three arcs, lit while there is a code. */
export const GUEST_WIFI_PICT = (
  <path d="M10 20a2 2 0 1 1 0 4a2 2 0 1 1 0-4Z M5.62 17.62A6.2 6.2 0 0 1 14.38 17.62L12.83 19.17A4 4 0 0 0 7.17 19.17Z M2.79 14.79A10.2 10.2 0 0 1 17.21 14.79L15.66 16.34A8 8 0 0 0 4.34 16.34Z M0 11.96A14.2 14.2 0 0 1 20 11.96L18.49 13.51A12 12 0 0 0 1.51 13.51Z" />
);

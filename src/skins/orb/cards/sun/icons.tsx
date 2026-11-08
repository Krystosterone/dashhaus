/**
 * The domain icon, every compact row's identity (row-identity skill): the sun on the horizon, an arrow over it saying
 * which way it goes next, down to its sunset or up to its sunrise. Its disc is filled while the sun is up, so the shape
 * says it without colour.
 */
export function SunIcon({ rising = false, up = false }: { rising?: boolean; up?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.2 14a3.8 3.8 0 0 1 7.6 0" fill={up ? "currentColor" : "none"} />
      <path d="M2.5 14h1.7M15.8 14h1.7M4.7 9.6l1.1 1.1M15.3 9.6l-1.1 1.1M3 17h14" />
      <path d={rising ? "M10 7.5V2.8M8.2 4.6 10 2.8l1.8 1.8" : "M10 2.8v4.7M8.2 5.7 10 7.5l1.8-1.8"} />
    </svg>
  );
}

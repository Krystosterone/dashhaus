const P = { fill: "none", stroke: "currentColor" } as const;

/** The domain icon: every compact row carries one (row-identity skill). Mist rising from the unit, or a dehumidifier's grille over its tank. */
export function HumidifierIcon({ kind = "humidifier" }: { kind?: "humidifier" | "dehumidifier" }) {
  if (kind === "dehumidifier") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" {...P}>
        <rect x="4.5" y="2.5" width="11" height="15" rx="1.5" />
        <path d="M7.5 5.5h5M7.5 7.5h5" />
        <path d="M10 10.3s2 2.1 2 3.5a2 2 0 0 1-4 0c0-1.4 2-3.5 2-3.5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...P}>
      <path d="M5.5 10h9v6.5a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5Z" />
      <path d="M8.5 13.5h3" />
      <path d="M7.5 7.5c-.9-.9-.9-1.8 0-2.7s.9-1.8 0-2.7M12.5 7.5c-.9-.9-.9-1.8 0-2.7s.9-1.8 0-2.7" />
    </svg>
  );
}

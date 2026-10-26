import type { CoverClass } from "../../../../domains/cover/types";

const P = { fill: "none", stroke: "currentColor" } as const;

/** Icon per kind of cover, open or closed; a stop square while it moves. */
export function CoverIcon({ kind, open, stop }: { kind: CoverClass; open: boolean; stop?: boolean }) {
  if (stop) return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6.5" y="6.5" width="7" height="7" rx="1.2" fill="currentColor" /></svg>;
  let d: string;
  switch (kind) {
    case "curtain":
      d = open
        ? "M3 4h14M4.5 4v12h2.8C6.6 12.5 6.6 7.5 7.6 4M15.5 4v12h-2.8c.7-3.5.7-8.5-.3-12"
        : "M3 4h14M4.5 4v12h5.1V4M15.5 4v12h-5.1V4M7 6v8M13 6v8";
      break;
    case "garage": case "door": case "gate":
      d = open
        ? "M3 8.5 10 4l7 4.5v8M3 8.5v8M6 16.5v-6.5h8v6.5M6 12h8"
        : "M3 8.5 10 4l7 4.5v8M3 8.5v8M6 10h8v6.5H6ZM6 12.2h8M6 14.4h8";
      break;
    case "window":
      d = "M4.5 3.5h11v13h-11ZM10 3.5v13M4.5 10h11";
      break;
    default: // blind, shade, shutter, awning
      d = open
        ? "M3.5 4h13M5 4v3.5h10V4M5 16.5V9.5M15 16.5V9.5"
        : "M3.5 4h13M5 4v12.5h10V4M5 7.5h10M5 11h10M5 14h10";
  }
  return <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d={d} /></svg>;
}

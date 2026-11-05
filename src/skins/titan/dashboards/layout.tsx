import type { CSSProperties, ReactNode, Ref } from "react";
import { useNow } from "@dashhaus/core/hooks";
import { clockFace } from "@dashhaus/core/entities/clock";
import { TitanHeader, dateCode } from "./Header";
import type { TitanHeaderProps } from "./Header";
import type { TitanFootprint } from "../shared/ui";
import "./dashboard.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export interface TitanPageProps extends Partial<TitanHeaderProps> {
  pageRef?: Ref<HTMLDivElement>;
  /** The destinations: in the left rail on a wide screen, docked at the bottom on a phone. */
  nav?: ReactNode;
  /** The rejected-command row, docked at the bottom centre. */
  status?: ReactNode;
  /** The words on the bottom bar, set right: "HOME · 4 SECTIONS · 16 CARDS". */
  footer?: string;
  children: ReactNode;
}

/** The reference's dot strip as decoration: a fixed pattern of lit and dim dots in a recessed coal segment. */
const PATTERN = "11 0 1011101110111111011101 0 1 011";
function Pattern() {
  return (
    <span className="titan-pattern" aria-hidden="true">
      {[...PATTERN].map((c, i) => <span key={i} data-dot={c === " " ? "gap" : c === "1" ? "lit" : "dim"} />)}
    </span>
  );
}

/**
 * The Titan Dashboard: the reference's frame. An elbow at the top left carries the date stamp and turns into the top
 * bar; the left rail holds the destinations as a column of keys; the headline sits right under the bar; a second elbow
 * closes the page at the bottom left into the bottom bar, which carries the footer. Rows of cards fill the middle.
 */
export function TitanPage({ pageRef, nav, status, footer, children, title, ...header }: TitanPageProps) {
  const now = useNow(header.now);
  const face = clockFace(now, { locale: header.locale, hourCycle: header.hourCycle, timeZone: header.timeZone });
  return (
    <div ref={pageRef} className="titan-dashboard" data-nav={nav ? "" : undefined}>
      <div className="titan-elbow-top" aria-hidden="true"><span className="titan-elbow-stamp">{dateCode(face.day)}</span></div>
      <div className="titan-topbar" aria-hidden="true"><span className="titan-topbar-run" /><Pattern /></div>
      {title ? <TitanHeader title={title} {...header} /> : <div className="titan-header" />}
      <aside className="titan-rail">
        {nav}
        <span className="titan-rail-fill" aria-hidden="true" />
      </aside>
      <main className="titan-dashboard-main">{children}</main>
      <div className="titan-elbow-bottom" aria-hidden="true" />
      <p className="titan-footer">{footer}</p>
      <div className="titan-bottombar" aria-hidden="true"><span className="titan-bottombar-run" /><span className="titan-bottombar-run" data-step="1" /><Pattern /></div>
      {status && <div className="titan-dashboard-dock">{status}</div>}
    </div>
  );
}

export interface TitanSectionProps {
  title?: string;
  note?: string;
  id?: string;
  columns?: number;
  footprint?: TitanFootprint;
  /** How many cards the row holds, on its count block. */
  count?: number;
  /** The Lovelace card's placed grid: its element (measured for its tracks) and its tracks as an inline style. */
  grid?: { ref: Ref<HTMLDivElement>; style: CSSProperties; tracks: number };
  children: ReactNode;
}

/** One titled section: a key-coloured block, the title in capitals, a bar running to its card count, then its grid. */
export function TitanSection({ title, note, id, columns, footprint = "standard", count, grid, children }: TitanSectionProps) {
  return (
    <section id={id} data-section-id={id} className="titan-section" aria-label={title ?? "Other"}>
      {(title || note) && (
        <div className="titan-section-head">
          <span className="titan-section-cap" aria-hidden="true" />
          {title && <h2>{title}</h2>}
          <span className="titan-section-run" aria-hidden="true" />
          {note && <p>{note}</p>}
          {count != null && <span className="titan-section-count" aria-label={`${count} cards`}>{String(count).padStart(2, "0")}</span>}
        </div>
      )}
      <div ref={grid?.ref} className="titan-grid" data-footprint={footprint} data-tracks={grid?.tracks} style={grid ? grid.style : columns ? { "--titan-columns": columns } as Vars : undefined}>{children}</div>
    </section>
  );
}

/** Several sections side by side, collapsing to one column on a phone. */
export function TitanColumns({ columns, children }: { columns: number; children: ReactNode }) {
  return <div className="titan-columns" style={{ "--titan-section-columns": columns } as Vars}>{children}</div>;
}

/** A Card spanning more than one explicit grid track. */
export function TitanCell({ span, children }: { span: number; children: ReactNode }) {
  return <div className="titan-cell" style={{ "--titan-span": Math.min(Math.max(Math.round(span), 1), 4) } as Vars}>{children}</div>;
}

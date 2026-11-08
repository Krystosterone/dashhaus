import type { CSSProperties, ReactNode, Ref } from "react";
import { HourCycleProvider } from "@dashhaus/core/hooks";
import { GlasshouseHeader } from "./Header";
import type { GlasshouseHeaderProps } from "./Header";
import type { GlasshouseFootprint } from "../shared/ui";
import "./dashboard.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export interface GlasshousePageProps extends Partial<Omit<GlasshouseHeaderProps, "nav">> {
  pageRef?: Ref<HTMLDivElement>;
  /** The nav bar: in the header's top bar. */
  nav?: ReactNode;
  /** What floats over the page's foot: the rejected-command row. */
  dock?: ReactNode;
  children: ReactNode;
}

/**
 * The Glasshouse Dashboard: the glowing page, its header with the nav, the sections, and a docked status row, every
 * card on the header's hour cycle.
 */
export function GlasshousePage({ pageRef, nav, dock, children, title, ...header }: GlasshousePageProps) {
  return (
    <HourCycleProvider hourCycle={header.hourCycle} locale={header.locale}>
      <div ref={pageRef} className="glasshouse-dashboard">
        {title ? <GlasshouseHeader title={title} nav={nav} {...header} /> : nav && <div className="glasshouse-topbar">{nav}</div>}
        <main className="glasshouse-dashboard-main">{children}</main>
        {dock && <div className="glasshouse-dashboard-dock">{dock}</div>}
      </div>
    </HourCycleProvider>
  );
}

export interface GlasshouseSectionProps {
  title?: string;
  note?: string;
  id?: string;
  columns?: number;
  footprint?: GlasshouseFootprint;
  /** The Lovelace card's placed grid: its element (measured for its tracks) and its tracks as an inline style. */
  grid?: { ref: Ref<HTMLDivElement>; style: CSSProperties; tracks: number };
  children: ReactNode;
}

/** One titled Dashboard section and its responsive Card grid. */
export function GlasshouseSection({ title, note, id, columns, footprint = "standard", grid, children }: GlasshouseSectionProps) {
  return (
    <section id={id} data-section-id={id} className="glasshouse-section" aria-label={title ?? "Other"}>
      {(title || note) && <div className="glasshouse-section-head">{title && <h2>{title}</h2>}{note && <p>{note}</p>}</div>}
      <div ref={grid?.ref} className="glasshouse-grid" data-footprint={footprint} data-tracks={grid?.tracks} style={grid ? grid.style : columns ? { "--glasshouse-columns": columns } as Vars : undefined}>{children}</div>
    </section>
  );
}

/** Several sections side by side, collapsing to one column on a phone. */
export function GlasshouseColumns({ columns, children }: { columns: number; children: ReactNode }) {
  return <div className="glasshouse-columns" style={{ "--glasshouse-section-columns": columns } as Vars}>{children}</div>;
}

/** A Card spanning more than one explicit grid track. */
export function GlasshouseCell({ span, children }: { span: number; children: ReactNode }) {
  return <div className="glasshouse-cell" style={{ "--glasshouse-span": Math.min(Math.max(Math.round(span), 1), 4) } as Vars}>{children}</div>;
}

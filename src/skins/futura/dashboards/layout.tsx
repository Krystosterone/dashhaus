import type { CSSProperties, ReactNode, Ref } from "react";
import { FuturaHeader } from "./Header";
import type { FuturaHeaderProps } from "./Header";
import type { FuturaFootprint } from "../shared/ui";
import "./dashboard.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export interface FuturaPageProps extends Partial<FuturaHeaderProps> {
  pageRef?: Ref<HTMLDivElement>;
  nav?: ReactNode;
  children: ReactNode;
}

/** The Futura Dashboard: optional header, sections, and a docked NavBar. */
export function FuturaPage({ pageRef, nav, children, title, ...header }: FuturaPageProps) {
  return (
    <div ref={pageRef} className="futura-dashboard" data-nav={nav ? "" : undefined}>
      {title && <FuturaHeader title={title} {...header} />}
      <main className="futura-dashboard-main">{children}</main>
      {nav && <div className="futura-dashboard-dock">{nav}</div>}
    </div>
  );
}

export interface FuturaSectionProps {
  title?: string;
  note?: string;
  id?: string;
  columns?: number;
  footprint?: FuturaFootprint;
  children: ReactNode;
}

/** One titled Dashboard section and its responsive Card grid. */
export function FuturaSection({ title, note, id, columns, footprint = "standard", children }: FuturaSectionProps) {
  return (
    <section id={id} data-section-id={id} className="futura-section" aria-label={title ?? "Other"}>
      {(title || note) && <div className="futura-section-head">{title && <h2>{title}</h2>}{note && <p>{note}</p>}</div>}
      <div className="futura-grid" data-footprint={footprint} style={columns ? { "--futura-columns": columns } as Vars : undefined}>{children}</div>
    </section>
  );
}

/** Several sections side by side, collapsing to one column on a phone. */
export function FuturaColumns({ columns, children }: { columns: number; children: ReactNode }) {
  return <div className="futura-columns" style={{ "--futura-section-columns": columns } as Vars}>{children}</div>;
}

/** A Card spanning more than one explicit grid track. */
export function FuturaCell({ span, children }: { span: number; children: ReactNode }) {
  return <div className="futura-cell" style={{ "--futura-span": Math.min(Math.max(Math.round(span), 1), 4) } as Vars}>{children}</div>;
}

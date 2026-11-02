import type { CSSProperties, ReactNode, Ref } from "react";
import { LcarsHeader } from "./Header";
import type { LcarsHeaderProps } from "./Header";
import type { LcarsFootprint } from "../shared/ui";
import "./dashboard.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export interface LcarsPageProps extends Partial<LcarsHeaderProps> {
  pageRef?: Ref<HTMLDivElement>;
  nav?: ReactNode;
  children: ReactNode;
}

/**
 * The Lcars Dashboard as an LCARS console: the header's elbow on top, then the body's elbow, whose rail down the left
 * holds the NavBar on a wide screen (on a phone the rail narrows and the NavBar docks at the bottom).
 */
export function LcarsPage({ pageRef, nav, children, title, ...header }: LcarsPageProps) {
  return (
    <div ref={pageRef} className="lcars-dashboard" data-nav={nav ? "" : undefined}>
      {title && <LcarsHeader title={title} {...header} />}
      <div className="lcars-frame">
        <aside className="lcars-rail">
          <div className="lcars-rail-cap" aria-hidden="true"><span>LCARS</span></div>
          {nav && <div className="lcars-dashboard-dock">{nav}</div>}
          <div className="lcars-rail-fill" aria-hidden="true"><span>{title ? "Online" : "Ready"}</span></div>
          <div className="lcars-rail-foot" aria-hidden="true" />
        </aside>
        <div className="lcars-frame-bar lcars-bar" aria-hidden="true"><i /><i /><i /><i /></div>
        <main className="lcars-dashboard-main">{children}</main>
      </div>
    </div>
  );
}

export interface LcarsSectionProps {
  title?: string;
  note?: string;
  id?: string;
  columns?: number;
  footprint?: LcarsFootprint;
  children: ReactNode;
}

/** One titled Dashboard section, headed by an LCARS bar with its name cut in, and its responsive Card grid. */
export function LcarsSection({ title, note, id, columns, footprint = "standard", children }: LcarsSectionProps) {
  return (
    <section id={id} data-section-id={id} className="lcars-section" aria-label={title ?? "Other"}>
      <div className="lcars-section-head">{title ? <h2>{title}</h2> : <h2>Other</h2>}{note && <p>{note}</p>}</div>
      <div className="lcars-grid" data-footprint={footprint} style={columns ? { "--lcars-columns": columns } as Vars : undefined}>{children}</div>
    </section>
  );
}

/** Several sections side by side, collapsing to one column on a phone. */
export function LcarsColumns({ columns, children }: { columns: number; children: ReactNode }) {
  return <div className="lcars-columns" style={{ "--lcars-section-columns": columns } as Vars}>{children}</div>;
}

/** A Card spanning more than one explicit grid track. */
export function LcarsCell({ span, children }: { span: number; children: ReactNode }) {
  return <div className="lcars-cell" style={{ "--lcars-span": Math.min(Math.max(Math.round(span), 1), 4) } as Vars}>{children}</div>;
}

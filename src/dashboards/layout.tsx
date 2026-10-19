import type { ReactNode } from "react";
import type { Vars } from "../shared/ui";
import { HeaderWidget } from "../widgets/header/HeaderWidget";
import type { HeaderWidgetProps } from "../widgets/header/HeaderWidget";
import "./layout.css";

/** A dashboard page: the header widget (title, date, optional clock), then sections. */
export function DashboardPage({ children, ...header }: HeaderWidgetProps & { children: ReactNode }) {
  return (
    <div className="dash">
      <HeaderWidget {...header} />
      {children}
    </div>
  );
}

/** Side-by-side columns of sections, for tablets and wall panels. */
export function Columns({ columns, gap, children }: { columns: number; gap?: number; children: ReactNode }) {
  return <div className="dash-cols" style={{ "--cols": columns, ...(gap ? { "--gap": `${gap}px` } : {}) } as Vars}>{children}</div>;
}

/** A titled grid of widgets. Each widget sizes itself from its cell's width. */
export function Section({ title, note, columns = 1, gap, when = true, children }: { title: string; note?: string; columns?: number; gap?: number; when?: boolean; children: ReactNode }) {
  if (!when) return null;
  return (
    <section className="dash-sec" aria-label={title}>
      <h2 className="dash-sec-h">{title}{note && <small>{note}</small>}</h2>
      <div className={columns === 1 ? "dash-grid dash-grid--1" : "dash-grid"} style={{ "--cols": columns, ...(gap ? { "--gap": `${gap}px` } : {}) } as Vars}>{children}</div>
    </section>
  );
}

/** A grid cell spanning one or more columns. */
export function Cell({ span = 1, children }: { span?: number; children: ReactNode }) {
  return <div className="dash-cell" style={{ gridColumn: `span ${span}` }}>{children}</div>;
}

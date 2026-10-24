import type { CSSProperties, ReactNode } from "react";
import { CardHeadingLevelContext } from "../shared/ui";
import type { Vars } from "../shared/ui";
import { HeaderWidget } from "../widgets/header/HeaderWidget";
import type { HeaderWidgetProps } from "../widgets/header/HeaderWidget";
import "./layout.css";

export interface DashboardPageProps extends HeaderWidgetProps {
  children: ReactNode;
  /** Optional host-level layout override, such as removing scroll padding on a fixed wall panel. */
  style?: CSSProperties;
}

/** A dashboard page: the header widget (title, date, optional clock), then any composition. */
export function DashboardPage({ children, style, ...header }: DashboardPageProps) {
  return (
    <div className="dash" style={style}>
      <HeaderWidget {...header} />
      {children}
    </div>
  );
}

/** Side-by-side columns of sections, for tablets and wall panels. */
export function Columns({ columns, gap, children }: { columns: number; gap?: number; children: ReactNode }) {
  return (
    <div
      className="dash-cols"
      style={{ "--cols": columns, ...(gap !== undefined ? { "--dash-cols-gap": `${gap}px` } : {}) } as Vars}
    >
      {children}
    </div>
  );
}
/** An ungrouped grid of widgets. Sections use the same primitive, but semantic grouping is optional. */
export function WidgetGrid({ columns = 1, gap, children }: { columns?: number; gap?: number; children: ReactNode }) {
  return (
    <div
      className={columns === 1 ? "dash-grid dash-grid--1" : "dash-grid"}
      style={{ "--cols": columns, ...(gap !== undefined ? { "--dash-grid-gap": `${gap}px` } : {}) } as Vars}
    >
      {children}
    </div>
  );
}

/** A titled grid of widgets. Each widget sizes itself from its cell's width. */
export function Section({ title, note, columns = 1, gap, children }: { title: string; note?: string; columns?: number; gap?: number; children: ReactNode }) {
  return (
    <section className="dash-sec" aria-label={title}>
      <h2 className="dash-sec-h">{title}{note && <small>{note}</small>}</h2>
      <CardHeadingLevelContext.Provider value={3}>
        <WidgetGrid columns={columns} gap={gap}>{children}</WidgetGrid>
      </CardHeadingLevelContext.Provider>
    </section>
  );
}

/** A grid cell spanning one or more columns. */
export function Cell({ span = 1, children }: { span?: number; children: ReactNode }) {
  return <div className="dash-cell" style={{ "--span": span } as Vars}>{children}</div>;
}

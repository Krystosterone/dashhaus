import type { CSSProperties, ReactNode } from "react";
import { Legend } from "../shared/ui";
import type { FieldFootprint } from "../shared/ui";
import { AlertLine, AlertsProvider } from "../shared/alerts";
import { Header } from "./Header";
import type { HeaderProps } from "./Header";
import "./layout.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export interface FieldPageProps extends HeaderProps {
  /** An alarm holds its inverted screen from the start, with no flash (a nursery's panel at night). */
  quiet?: boolean;
  children: ReactNode;
}

/**
 * A field page: its header, the alert line with every alarm and urgent warning its modules report, then its areas.
 * Modules anywhere under it report to that line. With neither a title nor the time, there is no header.
 */
export function FieldPage({ title, quiet, children, ...header }: FieldPageProps) {
  return (
    <AlertsProvider>
      <div className="fd-dash" data-quiet={quiet || undefined}>
        {(title || header.showTime) && <Header title={title} {...header} />}
        <AlertLine />
        {children}
      </div>
    </AlertsProvider>
  );
}

export interface AreaProps {
  /** The area's name, printed as its legend and naming the section. */
  title?: string;
  /** False keeps the name for a screen reader but prints no legend: a page with one area. */
  legend?: boolean;
  /** The grid's spacing: modules, or a column of 64 px rows with the rows' tighter gap. */
  footprint?: FieldFootprint;
  children: ReactNode;
}

/** One area's modules under its printed legend, in a grid whose columns come from its own width. */
export function Area({ title, legend = true, footprint = "standard", children }: AreaProps) {
  return (
    <section className="fd-dash-area" aria-label={title ?? "Other"}>
      {title && legend && <Legend>{title}</Legend>}
      <div className="fd-dash-grid" data-footprint={footprint}>{children}</div>
    </section>
  );
}

/** Areas side by side, one column each, for a tablet or a wall panel; one column under 640 px of page. */
export function Areas({ columns, children }: { columns: number; children: ReactNode }) {
  return <div className="fd-dash-areas" style={{ "--fd-cols": columns } as Vars}>{children}</div>;
}

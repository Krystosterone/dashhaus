import type { CSSProperties, ReactNode, Ref } from "react";
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
  /** "far": a wall panel read from across the room; its modules' print and screens are set a step up. */
  viewing?: "near" | "far";
  /** What docks at the bottom of the screen as the page scrolls: a `NavBar`, and anything that rides above it. */
  nav?: ReactNode;
  /** The page's root element, for a nav that follows its areas. */
  pageRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

/**
 * A field page: its header, the alert line with every alarm and urgent warning its modules report, then its areas,
 * and a nav docked at the bottom. Modules anywhere under it report to that line. With no title, subtitle or time,
 * there is no header.
 */
export function FieldPage({ title, quiet, viewing, nav, pageRef, children, ...header }: FieldPageProps) {
  return (
    <AlertsProvider>
      <div ref={pageRef} className="fd-dash" data-quiet={quiet || undefined} data-viewing={viewing === "far" ? "far" : undefined} data-nav={nav ? "" : undefined}>
        {(title || header.subtitle || header.showTime) && <Header title={title} {...header} />}
        <AlertLine />
        {children}
        {nav && <div className="fd-dash-dock">{nav}</div>}
      </div>
    </AlertsProvider>
  );
}

export interface AreaProps {
  /** The area's name, printed as its legend and naming the section. */
  title?: string;
  /** False keeps the name for a screen reader but prints no legend: a page with one area. */
  legend?: boolean;
  /** Printed at the legend's end. */
  note?: string;
  /** Where a nav finds it and jumps to it. */
  id?: string;
  /** At most this many modules across; fewer where the area is narrower. Left out, as many as fit. */
  columns?: number;
  /** The grid's spacing: modules, or a column of 64 px rows with the rows' tighter gap. */
  footprint?: FieldFootprint;
  children: ReactNode;
}

/** One area's modules under its printed legend, in a grid whose columns come from its own width. */
export function Area({ title, legend = true, note, id, columns, footprint = "standard", children }: AreaProps) {
  return (
    <section id={id} data-section-id={id} className="fd-dash-area" aria-label={title ?? "Other"}>
      {title && legend && <Legend as="h2" value={note}>{title}</Legend>}
      <div className="fd-dash-grid" data-footprint={footprint} data-columns={columns} style={columns ? { "--fd-cols-max": columns } as Vars : undefined}>{children}</div>
    </section>
  );
}

/** Areas side by side, one column each, for a tablet or a wall panel; one column under 640 px of page. */
export function Areas({ columns, children }: { columns: number; children: ReactNode }) {
  return <div className="fd-dash-areas" style={{ "--fd-cols": columns } as Vars}>{children}</div>;
}

/**
 * A module across more than one of its area's columns, where the area has that many; across all of them where it
 * has fewer. Up to four.
 */
export function Cell({ span, children }: { span: number; children: ReactNode }) {
  return <div className="fd-dash-cell" data-span={Math.min(Math.max(Math.round(span), 1), 4)}>{children}</div>;
}

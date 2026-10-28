import type { CSSProperties, ReactNode, Ref } from "react";
import { CardHeadingLevelContext } from "../shared/ui";
import type { Vars } from "../shared/ui";
import { Header } from "./Header";
import type { HeaderProps } from "./Header";
import "./layout.css";

export interface DashboardPageProps extends HeaderProps {
  children: ReactNode;
  /** Optional host-level layout override, such as removing scroll padding on a fixed wall panel. */
  style?: CSSProperties;
  /** "far": a wall panel read from across the room; status, captions and readouts are set for distance. */
  viewing?: "near" | "far";
  /** What docks at the bottom of the screen as the page scrolls: a `NavBar`, and anything that rides above it. */
  nav?: ReactNode;
  /** The page's root element, for a nav that follows its sections. */
  pageRef?: Ref<HTMLDivElement>;
}

/** A dashboard page: the header card (title, date, optional clock), then any composition, then its nav. */
export function DashboardPage({ children, style, viewing, nav, pageRef, ...header }: DashboardPageProps) {
  return (
    <div ref={pageRef} className="dash" style={style} data-viewing={viewing === "far" ? "far" : undefined} data-nav={nav ? "" : undefined}>
      <Header {...header} />
      {children}
      {nav && <div className="dash-dock">{nav}</div>}
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
/** An ungrouped grid of cards. Sections use the same primitive, but semantic grouping is optional. */
export function CardGrid({ columns = 1, gap, children }: { columns?: number; gap?: number; children: ReactNode }) {
  return (
    <div
      className={columns === 1 ? "dash-grid dash-grid--1" : "dash-grid"}
      style={{ "--cols": columns, ...(gap !== undefined ? { "--dash-grid-gap": `${gap}px` } : {}) } as Vars}
    >
      {children}
    </div>
  );
}

/** A titled grid of cards. Each card sizes itself from its cell's width. `id` lets a nav find and jump to it. */
export function Section({ id, title, note, columns = 1, gap, children }: { id?: string; title: string; note?: string; columns?: number; gap?: number; children: ReactNode }) {
  return (
    <section id={id} data-section-id={id} className="dash-sec" aria-label={title}>
      <h2 className="dash-sec-h">{title}{note && <small>{note}</small>}</h2>
      <CardHeadingLevelContext.Provider value={3}>
        <CardGrid columns={columns} gap={gap}>{children}</CardGrid>
      </CardHeadingLevelContext.Provider>
    </section>
  );
}

/** A grid cell spanning one or more columns. */
export function Cell({ span = 1, children }: { span?: number; children: ReactNode }) {
  return <div className="dash-cell" style={{ "--span": span } as Vars}>{children}</div>;
}

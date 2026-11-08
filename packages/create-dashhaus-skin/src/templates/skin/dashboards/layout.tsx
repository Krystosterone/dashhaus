import type { CSSProperties, ReactNode, Ref } from "react";
import { HourCycleProvider } from "@dashhaus/core/hooks";
import { __Skin__Header } from "./Header";
import type { __Skin__HeaderProps } from "./Header";
import type { __Skin__Footprint } from "../shared/ui";
import "./dashboard.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export interface __Skin__PageProps extends Partial<__Skin__HeaderProps> {
  pageRef?: Ref<HTMLDivElement>;
  nav?: ReactNode;
  children: ReactNode;
}

/**
 * The __Section__ Dashboard: optional header, sections, and a docked NavBar. Every card on it says its times on the
 * header's hour cycle (`HourCycleProvider`, YAML `hour_cycle`, else the locale's).
 */
export function __Skin__Page({ pageRef, nav, children, title, ...header }: __Skin__PageProps) {
  return (
    <HourCycleProvider hourCycle={header.hourCycle} locale={header.locale}>
      <div ref={pageRef} className="__skin__-dashboard" data-nav={nav ? "" : undefined}>
        {title && <__Skin__Header title={title} {...header} />}
        <main className="__skin__-dashboard-main">{children}</main>
        {nav && <div className="__skin__-dashboard-dock">{nav}</div>}
      </div>
    </HourCycleProvider>
  );
}

export interface __Skin__SectionProps {
  title?: string;
  note?: string;
  id?: string;
  columns?: number;
  footprint?: __Skin__Footprint;
  /** The Lovelace card's placed grid: its element (measured for its tracks) and its tracks as an inline style. */
  grid?: { ref: Ref<HTMLDivElement>; style: CSSProperties; tracks: number };
  children: ReactNode;
}

/** One titled Dashboard section and its responsive Card grid. */
export function __Skin__Section({ title, note, id, columns, footprint = "standard", grid, children }: __Skin__SectionProps) {
  return (
    <section id={id} data-section-id={id} className="__skin__-section" aria-label={title ?? "Other"}>
      {(title || note) && <div className="__skin__-section-head">{title && <h2>{title}</h2>}{note && <p>{note}</p>}</div>}
      <div ref={grid?.ref} className="__skin__-grid" data-footprint={footprint} data-tracks={grid?.tracks} style={grid ? grid.style : columns ? { "--__skin__-columns": columns } as Vars : undefined}>{children}</div>
    </section>
  );
}

/** Several sections side by side, collapsing to one column on a phone. */
export function __Skin__Columns({ columns, children }: { columns: number; children: ReactNode }) {
  return <div className="__skin__-columns" style={{ "--__skin__-section-columns": columns } as Vars}>{children}</div>;
}

/** A Card spanning more than one explicit grid track. */
export function __Skin__Cell({ span, children }: { span: number; children: ReactNode }) {
  return <div className="__skin__-cell" style={{ "--__skin__-span": Math.min(Math.max(Math.round(span), 1), 4) } as Vars}>{children}</div>;
}

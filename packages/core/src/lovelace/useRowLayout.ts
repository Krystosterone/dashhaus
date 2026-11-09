import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { placeRow, spanWidth, trackCount } from "./layout";
import type { RowPlacement, TrackPolicy } from "./layout";
import type { RowConfig } from "./schema";

/*
 * A row of the shared layout, placed at the width it is drawn: the grid's tracks, and each card's grid lines. The row
 * measures itself, so a row narrowed by its parent (a tablet's column, a wall panel's side) yields tracks the way a
 * phone does. It draws again only when the placement changes, never on an entity's state.
 */

/** One card's place, as the inline style of the element around it. */
export interface PlacedCell {
  column: number;
  span: number;
  row: number;
  height: number;
  style: CSSProperties;
}

export interface RowLayout {
  /** The element whose width decides the tracks: the row's grid. */
  ref: RefObject<HTMLDivElement>;
  tracks: number;
  /** The row's height in units. */
  rows: number;
  /** One per card, in the row's order. */
  cells: PlacedCell[];
  /** The grid's own inline style: its tracks. */
  style: CSSProperties;
  /** Whether the cards' `column` anchors hold at this width (`placeRow`): the row has the tracks it was written for. */
  anchored: boolean;
}

/**
 * Lay out one row. `height` is a card's height in the skin's units at the width it gets (an orb bundle that stacks
 * when narrow is taller); left out, every card is one unit, as in a skin whose rows hold one footprint.
 */
export function useRowLayout<I>(row: RowConfig<I>, policy: TrackPolicy, height?: (item: I, width: number | undefined) => number): RowLayout {
  const ref = useRef<HTMLDivElement>(null);
  // The last width measured; a new placement at it draws again (`redraw`), a width that changes nothing doesn't.
  const width = useRef<number | undefined>(undefined);
  const [, redraw] = useState(0);
  const place = (at: number | undefined): RowPlacement => {
    const tracks = trackCount(at, row.columns, policy);
    return placeRow(row.cards.map((entry) => ({
      width: entry.width,
      column: entry.column,
      height: height ? (span: number) => height(entry.item, spanWidth(at, tracks, span, policy.gap)) : 1,
    })), { tracks, columns: row.columns, flow: row.flow, align: row.align });
  };
  const placement = place(width.current);
  const key = JSON.stringify(placement);
  const latest = useRef({ place, key });
  latest.current = { place, key };

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = (next: number) => {
      width.current = next > 0 ? next : undefined;
      if (JSON.stringify(latest.current.place(width.current)) !== latest.current.key) redraw((n) => n + 1);
    };
    measure(element.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return {
    ref,
    tracks: placement.tracks,
    rows: placement.rows,
    cells: placement.cells.map((cell) => ({
      ...cell,
      style: { gridColumn: `${cell.column} / span ${cell.span}`, gridRow: `${cell.row} / span ${cell.height}` },
    })),
    style: { gridTemplateColumns: `repeat(${placement.tracks}, minmax(0, 1fr))` },
    anchored: placement.anchored,
  };
}

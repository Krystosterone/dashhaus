import type { __Name__Entity, __Name__History } from "@dashhaus/core/entities/__name__/types";
import { lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { __Name__Icon } from "./icons";
import { CardFrame, Readout, Today, fmt1, normalizeReadings, paint, useCard, detailsSheet } from "../../shared/ui";
import type { CardProps, ColorProp, SheetProps } from "../../shared/ui";
import "./__Name__Card.css";

export interface __Name__CardProps extends CardProps {
  entity: __Name__Entity;
  /** Today's readings, on the featured footprint and in the sheet. */
  history?: __Name__History;
  /** Card only: the name and the reading open the details sheet. */
  onOpenDetails?: () => void;
  /** The icon's colour, if any. Default: none (a bare icon). */
  color?: ColorProp;
}

/** Whole numbers as they are, anything else to one decimal. */
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : fmt1(n));
/** "42%", "21.4°C", but "650 ppm": symbols sit on the figure, words keep a space. */
const withUnit = (n: number, unit = "") => `${fmt(n)}${unit && !/^[%°]/.test(unit) ? " " : ""}${unit}`;

/**
 * One __label__ (`__domain__.*`): a reading. Neutral, a bare icon in place of an orb, the figure as a readout
 * with no container, and no glow. The name or the reading opens the sheet with today's readings.
 */
export function __Name__Card({ entity: e, history, variant, footprint, showControl, onOpenDetails, onClose, color }: __Name__CardProps) {
  const card = useCard("__code__", { variant, footprint, showControl });
  const unav = e.state === "unavailable";
  const value = unav ? undefined : e.value;
  const colors = paint("reading", 0, null, color);

  const text = unav ? "Unavailable" : value == null ? "No reading yet" : withUnit(value, e.unit);
  const spoken = value == null ? "no reading yet" : `${fmt(value)} ${e.unit ?? ""}`.trim();
  const status = unav ? "Unavailable" : e.area;
  const series = history ? normalizeReadings(history.readings) : null;

  const bar = (
    <span className="hd-bar">
      {value != null ? <span className="hd-metric __code__-f">{fmt(value)}{e.unit && <small>{e.unit}</small>}</span> : <span className="hd-none">No reading yet</span>}
    </span>
  );

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": unav ? "unavailable" : "ok", ...colors }}
      glyph={<__Name__Icon />}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={status}
      value={text}
      onClose={onClose}
      control={card.sheet || !onOpenDetails ? <Readout label={spoken}>{bar}</Readout>
        : <Readout label={`${e.name}: ${spoken}`} onOpen={onOpenDetails}>{bar}</Readout>}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated), end: unav && e.area ? e.area : "" }}
    >
      {series && (
        <Today
          samples={series.samples}
          currentHour={history!.currentHour}
          summary={series.min == null || series.max == null ? "No readings yet today" : `Low ${withUnit(series.min, e.unit)} · High ${withUnit(series.max, e.unit)}`}
        />
      )}
    </CardFrame>
  );
}

export type __Name__SheetProps = SheetProps<__Name__CardProps>;

export const __Name__Sheet = detailsSheet(__Name__Card);

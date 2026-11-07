import type { NumericEntity, NumericHistory } from "@dashhaus/core/entities/numeric/types";
import { fmtNumeric, numericFact, numericFigure, numericToday, numericWords, withUnit } from "@dashhaus/core/entities/numeric/readings";
import { lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { NumericIcon } from "./icons";
import { CardFrame, Readout, Today, paint, useCard, detailsSheet } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./NumericCard.css";

export interface NumericCardProps extends CardProps {
  entity: NumericEntity;
  /** Today's readings, as the second metric, on the featured footprint and in the sheet. */
  history?: NumericHistory;
  /** Card only: the name and the reading open the details sheet. */
  onOpenDetails?: () => void;
}

/**
 * One numeric reading (`sensor.*`: CO₂ in ppm, power in W, energy in kWh): a reading, whatever it measures. Neutral,
 * the bare icon its device class names in place of an orb (air, power, a meter, a gauge), the figure in its unit as a
 * readout with no container, and no glow. The figure takes five places at most, scaled with an SI letter beyond
 * (`numericFigure`), so it never loses a digit to an ellipsis; it is heard in full. Today's second metric is the
 * day's low and high, or how far a meter that only climbs rose. The status line says the area and what it measures
 * ("Living room · CO₂"). It has no warning: a threshold of its own would be a guess (spec/cards.md). The name or the
 * reading opens the sheet with today's readings by hour.
 */
export function NumericCard({ entity: e, history, variant, footprint, showControl, onOpenDetails, onClose }: NumericCardProps) {
  const card = useCard("nm", { variant, footprint, showControl, area: e.area });
  const { sheet, area } = card;
  const unav = e.state === "unavailable";
  const value = unav ? undefined : e.value;
  const words = numericWords(e.deviceClass);
  const colors = paint("reading", 0);
  const today = history ? numericToday(e, history) : undefined;

  const figure = value != null ? numericFigure(value) : undefined;
  const text = unav ? "Unavailable" : figure == null ? "No reading yet" : withUnit(figure, e.unit);
  const spoken = value == null ? "no reading yet" : withUnit(fmtNumeric(value), e.unit);
  const status = unav ? "Unavailable" : [area, words.label].filter(Boolean).join(" · ") || undefined;

  const bar = (
    <span className="hd-bar nm-bar">
      {figure != null
        ? <span className="hd-metric nm-f"><span className="nm-v">{figure}</span>{e.unit && <small>{e.unit}</small>}</span>
        : <span className="hd-none">No reading yet</span>}
      {figure != null && today?.short && (
        <span className="hd-metric hd-metric--sub nm-today">
          <span className="hd-label">Today</span>
          <span className="nm-t">{today.short}</span>
        </span>
      )}
    </span>
  );
  const heard = today?.short ? `${spoken}, today ${today.long}` : spoken;

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": unav ? "unavailable" : "ok", ...colors }}
      glyph={<NumericIcon picture={words.picture} />}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={status}
      value={text}
      readout={{ value: figure != null ? <>{figure}{e.unit && <span>{e.unit}</span>}</> : null, label: sheet && figure != null ? spoken : undefined }}
      onClose={onClose}
      // The sheet's header says the figure and its strip the day: it keeps the slot only to say there is none.
      slot={!sheet || unav || figure == null}
      control={sheet || !onOpenDetails ? <Readout label={heard}>{bar}</Readout>
        : <Readout label={`${e.name}: ${heard}`} onOpen={onOpenDetails}>{bar}</Readout>}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated), end: numericFact(e) }}
    >
      {today && <Today samples={today.samples} currentHour={history!.currentHour} summary={today.long} />}
    </CardFrame>
  );
}

export type NumericSheetProps = SheetProps<NumericCardProps>;

export const NumericSheet = detailsSheet(NumericCard);

import type { NumericEntity, NumericHistory } from "@dashhaus/core/entities/numeric/types";
import { TODAY_SHORT_PLACES, fmtNumeric, numericFigure, numericToday, withUnit } from "@dashhaus/core/entities/numeric/readings";
import { numericFact, numericLimitFact, numericWords } from "@dashhaus/core/entities/numeric/words";
import { numericWarning } from "@dashhaus/core/entities/numeric/severity";
import { lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { NumericIcon } from "./icons";
import { AlertStatus, CardFrame, Readout, Today, paint, useCard, detailsSheet } from "../../shared/ui";
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
 * day's low and high, or how far a meter that only climbs rose, left out where it would not fit whole
 * (`TODAY_SHORT_PLACES`). The status line says the area and what it measures ("Living room · CO₂"), and before a first
 * reading "No reading yet", the readout "Waiting…", as the sensor card. It warns only past a limit the person set
 * (`warnAbove`, `warnBelow`; a threshold of its own would be a guess, spec/cards.md): core's word leads the status
 * line behind the warn marker ("High CO₂ · Living room"), in place of what it measures, advisory, so the figure keeps
 * its ink and the card no glow; a compact row's value line says it the same way. The sheet's small print says the
 * limits, whether or not it warns. The name or the reading opens the sheet with today's readings by hour.
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
  const text = unav ? "Unavailable" : figure == null ? "Waiting…" : withUnit(figure, e.unit);
  const spoken = value == null ? "no reading yet" : withUnit(fmtNumeric(value), e.unit);
  // Core ranks it (a limit the person set, advisory) and words it; the card draws the word it is given, first.
  const warning = numericWarning(e);
  const alertLabel = warning ? `Warning: ${warning.said}` : null;
  const status = unav ? "Unavailable"
    // In a narrow card the area gives way, so the line never clips and the word keeps its room.
    : warning ? <><AlertStatus label={alertLabel!}>{warning.word}</AlertStatus>{area && <span className="hd-sub-optional">{` · ${area}`}</span>}</>
    : [area, figure == null ? "No reading yet" : words.label].filter(Boolean).join(" · ") || undefined;
  // A second metric that can't fit its track is left out, never cut: the strip and the sheet say it in full.
  const todayMetric = today?.short && today.short.length <= TODAY_SHORT_PLACES ? today.short : undefined;

  const bar = (
    <span className="hd-bar hd-bar--pair nm-bar">
      {figure != null
        ? <span className="hd-metric nm-f"><span className="nm-v hd-metric-n">{figure}</span>{e.unit && <small>{e.unit}</small>}</span>
        : <span className="hd-none">Waiting…</span>}
      {figure != null && todayMetric && (
        <span className="hd-metric hd-metric--sub nm-today">
          <span className="hd-label">Today</span>
          <span className="nm-t">{todayMetric}</span>
        </span>
      )}
    </span>
  );
  const heard = today?.short ? `${spoken}, today ${today.long}` : spoken;

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": unav ? "unavailable" : "ok", "data-alert": warning ? "warn" : undefined, ...colors }}
      glyph={<NumericIcon picture={words.picture} />}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={status}
      // A compact row's value line leads with the warning behind its marker, as its status line does, and the figure
      // follows in its own ink, so a clip gives up the figure first; a hidden reading's place keeps the figure alone.
      value={warning ? <><AlertStatus label={alertLabel!}>{warning.word}</AlertStatus>{` · ${text}`}</> : text}
      bareValue={text}
      readout={{ value: figure != null ? <>{figure}{e.unit && <span>{e.unit}</span>}</> : null, label: sheet && figure != null ? spoken : undefined }}
      onClose={onClose}
      // The sheet's header says the figure and its strip the day: it keeps the slot only to say there is none.
      slot={!sheet || unav || figure == null}
      control={sheet || !onOpenDetails ? <Readout label={heard}>{bar}</Readout>
        : <Readout label={`${e.name}: ${heard}`} onOpen={onOpenDetails}>{bar}</Readout>}
      // When first, then what it is and the limits it warns past.
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated), end: [numericFact(e), numericLimitFact(e)].filter(Boolean).join(" · ") }}
    >
      {today && <Today samples={today.samples} currentHour={history!.currentHour} summary={today.long} />}
    </CardFrame>
  );
}

export type NumericSheetProps = SheetProps<NumericCardProps>;

export const NumericSheet = detailsSheet(NumericCard);

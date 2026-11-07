import type { ReactNode } from "react";
import type { NumericEntity, NumericHistory } from "@dashhaus/core/entities/numeric/types";
import { FIGURE_PLACES, fmtNumeric, numericFact, numericFigure, numericToday, numericWords, withUnit } from "@dashhaus/core/entities/numeric/readings";
import { lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { Blank, Digits, Glyph, ModuleFrame, ModuleRow, Pictogram, Today, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { IconNumeric, NUMERIC_PICT } from "./icons";
import "./NumericModule.css";

export interface NumericModuleProps {
  entity: NumericEntity;
  footprint?: FieldFootprint;
  /** Today's readings by hour, on the module's meter and in the panel. Omit and its hours stay dark. */
  history?: NumericHistory;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/**
 * One numeric reading (CO₂ in ppm, power in W, energy in kWh) as a field module: a reading, so nothing on it is
 * pressed but its name. Where a control has its key and fader, it has its glyph, the picture its device class names
 * (air, power, a meter, a gauge), on a flat plate, and today's meter. The screen says the figure in five places, the
 * leading ones unlit segments ("00650"), with its unit after it, scaled with an SI letter beyond five ("1.2M"; heard in
 * full), and blank segments while there is none; the meta lines what it measures and when it last reported. Today is
 * the day's low and high, or how far a meter that only climbs rose. It has no warning of its own. The name opens the
 * panel: today's readings by hour, when it reported and what it measures.
 */
export function NumericModule({ entity: e, history, footprint = "standard", defaultOpen = false }: NumericModuleProps) {
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const value = unav ? undefined : e.value;
  const words = numericWords(e.deviceClass);
  const today = history ? numericToday(e, history) : undefined;

  const pict = <Pictogram param="neutral" lit={value != null}>{NUMERIC_PICT[words.picture]}</Pictogram>;
  const read: ReactNode = unav ? <Blank places={FIGURE_PLACES} label="Unavailable" />
    : value == null ? <Blank places={FIGURE_PLACES} label="No reading yet" />
    : <>
      <span className="fd-read-fig" aria-hidden="true"><Digits text={numericFigure(value)} places={FIGURE_PLACES} /></span>
      {e.unit && <small aria-hidden="true">{e.unit}</small>}
      <span className="fd-sr">{withUnit(fmtNumeric(value), e.unit)}</span>
    </>;
  const updated = e.lastUpdated ? `Updated ${e.lastUpdated}` : undefined;
  const lines: ReactNode[] = unav ? ["Unavailable", e.lastSeen ? `Seen ${e.lastSeen}` : null]
    : [value == null ? "No reading yet" : null, words.label || null, updated];
  const [first, second] = lines.filter(Boolean);
  const meta: [ReactNode, ReactNode?] | undefined = first ? [first, second] : undefined;

  const glyph = <Glyph unavailable={unav}><IconNumeric picture={words.picture} /></Glyph>;
  const label = `${words.label || "Reading"} by hour today.`;

  return (
    <ModuleFrame
      kind="fd-nm"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={glyph}
      row={(
        <ModuleRow className="fd-nm-row">
          {glyph}
          <Today summary={today?.short} label={label} tone="neutral" samples={today?.samples} currentHour={history?.currentHour} />
        </ModuleRow>
      )}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated), end: numericFact(e) }}
    >
      {history && today && (
        <Today
          // One meter in the panel, so its legend is Today, as the sensor's.
          legend="Today"
          // As the sensor's: the day's readings while gone, and nothing to say when there were none.
          summary={unav && !today.short ? undefined : today.long}
          label={label}
          tone="neutral"
          samples={today.samples}
          currentHour={history.currentHour}
        />
      )}
    </ModuleFrame>
  );
}

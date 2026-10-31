import { fmt1 } from "@dashhaus/core/entities/format";

const CARD_CODE = "rd";

export interface ReadingCardProps {
  name: string;
  value: number | null;
  unit?: string;
}

/** A reading card on the shared formatter: a name, a figure and a unit, with no action. */
export function ReadingCard({ name, value, unit }: ReadingCardProps) {
  return (
    <article className="fx-rd-card" data-card-code={CARD_CODE} data-state={value === null ? "unavailable" : "ready"}>
      <span className="fx-rd-name">{name}</span>
      <p className="fx-rd-value">
        {value === null ? "—" : fmt1(value)}
        {value !== null && unit ? <span className="fx-rd-unit">{unit}</span> : null}
      </p>
    </article>
  );
}

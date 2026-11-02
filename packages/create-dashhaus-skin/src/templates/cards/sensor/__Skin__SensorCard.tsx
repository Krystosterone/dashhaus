import { detailsSheet, detailsTile, useCardFrame } from "@dashhaus/dashboard/card";
import type { CardProps, SheetProps, TileProps } from "@dashhaus/dashboard/card";
import { fmt1 } from "@dashhaus/core/entities/format";
import { CardHead, Fact, Row, Sheet } from "../../shared/ui";

const CARD_CODE = "sn";

export interface __Skin__SensorCardProps extends CardProps {
  name: string;
  area?: string;
  temperature?: number;
  humidity?: number;
  unit: "°C" | "°F";
}

/**
 * One room reading: a name, its room, the temperature (or the humidity, for a humidity sensor) and the humidity under
 * it. `useCardFrame` gives it the frame's footprint and name; its details are the same card as `variant="sheet"`.
 */
export function __Skin__SensorCard({ name, area, temperature, humidity, unit, variant, footprint, showControl, onOpenDetails }: __Skin__SensorCardProps) {
  // The scaffolder fills __Skin__ with the skin's PascalCase name; the placeholder alone is not a component name to ESLint.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const frame = useCardFrame({ variant, footprint, showControl });
  const unavailable = temperature == null && humidity == null;
  const reading = unavailable ? "—" : temperature != null ? `${fmt1(temperature)}${unit}` : `${Math.round(humidity!)}%`;
  return (
    <article className="__skin__-card __skin__-sn-card" data-card-code={CARD_CODE} data-state={unavailable ? "unavailable" : "ready"} data-variant={frame.sheet ? "sheet" : "card"} data-footprint={frame.footprint} {...frame.article}>
      {frame.bare
        ? <Row id={frame.nameId} name={name} area={area} reading={reading} onOpen={onOpenDetails} />
        : (
          <>
            <CardHead id={frame.nameId} name={name} area={area} onOpen={onOpenDetails} />
            <p className="__skin__-sn-reading">{reading}</p>
            {temperature != null && humidity != null && <p className="__skin__-sn-humidity">{Math.round(humidity)}% humidity</p>}
          </>
        )}
      {frame.sheet && (
        <dl className="__skin__-facts">
          <Fact label="Area">{area ?? "No area"}</Fact>
          <Fact label="Temperature">{temperature == null ? "—" : `${fmt1(temperature)}${unit}`}</Fact>
          <Fact label="Humidity">{humidity == null ? "—" : `${Math.round(humidity)}%`}</Fact>
          <Fact label="Unit">{unit}</Fact>
        </dl>
      )}
    </article>
  );
}

export type __Skin__SensorSheetProps = SheetProps<__Skin__SensorCardProps>;

/** The sensor's details: the card again as `variant="sheet"` in the skin's sheet. */
export const __Skin__SensorSheet = detailsSheet(__Skin__SensorCard, Sheet, (props) => `${props.name} details`);

export type __Skin__SensorTileProps = TileProps<__Skin__SensorCardProps>;

/** A dashboard-ready room reading: the card plus its details sheet, with the frame owning the open state. */
export const __Skin__SensorTile = detailsTile(__Skin__SensorCard, __Skin__SensorSheet);

import { detailsSheet, detailsTile, useCardFrame } from "@dashhaus/dashboard/card";
import type { CardProps, SheetProps, TileProps } from "@dashhaus/dashboard/card";
import { Action, CardHead, Fact, Row, Sheet } from "../../shared/ui";

const CARD_CODE = "lt";

export interface __Skin__LightCardProps extends CardProps {
  name: string;
  area?: string;
  on: boolean;
  unavailable?: boolean;
  brightness?: number;
  onToggle: () => void;
}

/**
 * One light: its name, its room, the reading, and one button that switches it. `useCardFrame` gives it the frame's
 * footprint and name; its details are the same card as `variant="sheet"`, so they show only these facts.
 */
export function __Skin__LightCard({ name, area, on, unavailable = false, brightness, onToggle, variant, footprint, showControl, onOpenDetails }: __Skin__LightCardProps) {
  // The scaffolder fills __Skin__ with the skin's PascalCase name; the placeholder alone is not a component name to ESLint.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const frame = useCardFrame({ variant, footprint, showControl });
  const state = unavailable ? "unavailable" : on ? "on" : "off";
  const reading = unavailable ? "—" : on ? (brightness == null ? "On" : `${brightness}%`) : "Off";
  return (
    <article className="__skin__-card __skin__-lt-card" data-card-code={CARD_CODE} data-state={state} data-variant={frame.sheet ? "sheet" : "card"} data-footprint={frame.footprint} {...frame.article}>
      {frame.bare
        ? <Row id={frame.nameId} name={name} area={area} reading={reading} onOpen={onOpenDetails} />
        : (
          <>
            <CardHead id={frame.nameId} name={name} area={area} onOpen={onOpenDetails} />
            <p className="__skin__-lt-reading">{reading}</p>
          </>
        )}
      {frame.sheet && (
        <dl className="__skin__-facts">
          <Fact label="Area">{area ?? "No area"}</Fact>
          <Fact label="State">{unavailable ? "Unavailable" : on ? "On" : "Off"}</Fact>
          <Fact label="Brightness">{unavailable || brightness == null ? "—" : `${brightness}%`}</Fact>
        </dl>
      )}
      {(frame.sheet || !frame.bare) && <Action label={on ? "On" : "Off"} onPress={onToggle} pressed={on} unavailable={unavailable} />}
    </article>
  );
}

export type __Skin__LightSheetProps = SheetProps<__Skin__LightCardProps>;

/** The light's details: the card again as `variant="sheet"` in the skin's sheet. */
export const __Skin__LightSheet = detailsSheet(__Skin__LightCard, Sheet, (props) => `${props.name} details`);

export type __Skin__LightTileProps = TileProps<__Skin__LightCardProps>;

/** A dashboard-ready light: the card plus its details sheet, with the frame owning the open state. */
export const __Skin__LightTile = detailsTile(__Skin__LightCard, __Skin__LightSheet);

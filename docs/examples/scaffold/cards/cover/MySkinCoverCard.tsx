import { detailsSheet, detailsTile, useCardFrame } from "@dashhaus/dashboard/card";
import type { CardProps, SheetProps, TileProps } from "@dashhaus/dashboard/card";
import { Action, CardHead, Fact, Row, Sheet } from "../../shared/ui";

const CARD_CODE = "cv";

export interface MySkinCoverCardProps extends CardProps {
  name: string;
  area?: string;
  /** 0 closed, 100 open; absent for a cover that only opens and closes. */
  position?: number;
  state: "open" | "closed" | "opening" | "closing" | "unavailable";
  onOpenCover: () => void;
  onCloseCover: () => void;
}

/** One cover: its name, its room, how open it is, and a button for the way it isn't going. */
export function MySkinCoverCard({ name, area, position, state, onOpenCover, onCloseCover, variant, footprint, showControl, onOpenDetails }: MySkinCoverCardProps) {
  const frame = useCardFrame({ variant, footprint, showControl });
  const unavailable = state === "unavailable";
  const open = state === "open" || state === "opening";
  const reading = unavailable ? "—" : position == null ? state : `${position}% open`;
  return (
    <article className="my-skin-card my-skin-cv-card" data-card-code={CARD_CODE} data-state={state} data-variant={frame.sheet ? "sheet" : "card"} data-footprint={frame.footprint} {...frame.article}>
      {frame.bare
        ? <Row id={frame.nameId} name={name} area={area} reading={reading} onOpen={onOpenDetails} />
        : (
          <>
            <CardHead id={frame.nameId} name={name} area={area} onOpen={onOpenDetails} />
            <p className="my-skin-cv-reading">{reading}</p>
          </>
        )}
      {frame.sheet && (
        <dl className="my-skin-facts">
          <Fact label="Area">{area ?? "No area"}</Fact>
          <Fact label="State">{state}</Fact>
          <Fact label="Position">{position == null ? "—" : `${position}% open`}</Fact>
        </dl>
      )}
      {(frame.sheet || !frame.bare) && <Action label={open ? "Close" : "Open"} onPress={open ? onCloseCover : onOpenCover} unavailable={unavailable} />}
    </article>
  );
}

export type MySkinCoverSheetProps = SheetProps<MySkinCoverCardProps>;

/** The cover's details: the card again as `variant="sheet"` in the skin's sheet. */
export const MySkinCoverSheet = detailsSheet(MySkinCoverCard, Sheet, (props) => `${props.name} details`);

export type MySkinCoverTileProps = TileProps<MySkinCoverCardProps>;

/** A dashboard-ready cover: the card plus its details sheet, with the frame owning the open state. */
export const MySkinCoverTile = detailsTile(MySkinCoverCard, MySkinCoverSheet);

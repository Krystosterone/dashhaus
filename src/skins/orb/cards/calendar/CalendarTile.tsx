import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { CalendarCard, CalendarSheet } from "./CalendarCard";
import type { CalendarCardProps } from "./CalendarCard";

export type CalendarTileProps = TileProps<CalendarCardProps>;

/** A dashboard-ready calendar: the card in its size container, plus its detail sheet. */
export const CalendarTile = detailsTile(CalendarCard, CalendarSheet);

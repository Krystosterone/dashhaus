import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { AlarmCard, AlarmSheet } from "./AlarmCard";
import type { AlarmCardProps } from "./AlarmCard";

/** `defaultOpen`: start with the sheet open; with `defaultAction`, on that action's keypad. */
export type AlarmTileProps = TileProps<AlarmCardProps>;

/** A dashboard-ready alarm: the card, plus its sheet, which opens on the keypad when an action needs the code. */
export const AlarmTile = detailsTile(AlarmCard, AlarmSheet);

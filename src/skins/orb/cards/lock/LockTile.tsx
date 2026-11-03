import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { LockCard, LockSheet } from "./LockCard";
import type { LockCardProps } from "./LockCard";

/** `defaultOpen`: start with the sheet open; with `defaultAction`, on that action's question or keypad. */
export type LockTileProps = TileProps<LockCardProps>;

/** A dashboard-ready lock: the card, plus its sheet, which opens on the question or keypad when an unlock is asked for. */
export const LockTile = detailsTile(LockCard, LockSheet);

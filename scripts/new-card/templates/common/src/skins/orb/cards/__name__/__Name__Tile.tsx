import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { __Name__Card, __Name__Sheet } from "./__Name__Card";
import type { __Name__CardProps } from "./__Name__Card";

export type __Name__TileProps = TileProps<__Name__CardProps>;

/** A dashboard-ready __label__: the card in its size container, plus its detail sheet. */
export const __Name__Tile = detailsTile(__Name__Card, __Name__Sheet);

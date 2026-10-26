import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { __Name__Widget, __Name__Sheet } from "./__Name__Widget";
import type { __Name__WidgetProps } from "./__Name__Widget";

export type __Name__TileProps = TileProps<__Name__WidgetProps>;

/** A dashboard-ready __label__: the card in its size container, plus its detail sheet. */
export const __Name__Tile = detailsTile(__Name__Widget, __Name__Sheet);

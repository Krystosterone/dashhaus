import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { VacuumCard, VacuumSheet } from "./VacuumCard";
import type { VacuumCardProps } from "./VacuumCard";

export type VacuumTileProps = TileProps<VacuumCardProps>;

/** A dashboard-ready vacuum: the card in its size container, plus its detail sheet. */
export const VacuumTile = detailsTile(VacuumCard, VacuumSheet);

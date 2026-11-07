import { detailsTile } from "../../shared/ui";
import type { TileProps } from "../../shared/ui";
import { CameraCard, CameraSheet } from "./CameraCard";
import type { CameraCardProps } from "./CameraCard";

export type CameraTileProps = TileProps<CameraCardProps>;

/** A dashboard-ready camera: the card in its size container, plus its detail sheet. */
export const CameraTile = detailsTile(CameraCard, CameraSheet);

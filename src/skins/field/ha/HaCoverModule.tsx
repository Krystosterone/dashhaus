import { useHaCover } from "../../../ha/hooks/cover";
import type { HaCoverOptions } from "../../../ha/hooks/cover";
import { CoverModule } from "../cards/cover/CoverModule";
import type { CoverModuleProps } from "../cards/cover/CoverModule";

export interface HaCoverModuleProps extends HaCoverOptions, Pick<CoverModuleProps, "footprint" | "defaultOpen"> {
  entityId: string;
}

/** A live cover module: the useHaCover hook above field's module, with today's history, position and tilt. */
export function HaCoverModule({ entityId, footprint, defaultOpen, ...options }: HaCoverModuleProps) {
  const { entity, history, actions } = useHaCover(entityId, options);
  return (
    <CoverModule
      entity={entity}
      history={history}
      onOpenCover={actions.onOpenCover}
      onCloseCover={actions.onCloseCover}
      onStopCover={actions.onStopCover}
      onSetPosition={actions.onSetPosition}
      onSetTilt={actions.onSetTilt}
      footprint={footprint}
      defaultOpen={defaultOpen}
    />
  );
}

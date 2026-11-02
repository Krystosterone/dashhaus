import { useHaLock } from "@dashhaus/core";
import type { HaLockOptions } from "@dashhaus/core";
import { LockModule } from "../cards/lock/LockModule";
import type { LockModuleProps } from "../cards/lock/LockModule";

export interface HaLockModuleProps extends HaLockOptions, Pick<LockModuleProps, "footprint" | "readOnly" | "defaultOpen"> {
  entityId: string;
}

/** A live lock module: the useHaLock hook, with its device's battery, above field's module. */
export function HaLockModule({ entityId, footprint, readOnly, defaultOpen, ...options }: HaLockModuleProps) {
  const { entity, actions } = useHaLock(entityId, options);
  return (
    <LockModule
      entity={entity}
      onLock={actions.onLock}
      onUnlock={actions.onUnlock}
      onOpenDoor={actions.onOpen}
      readOnly={readOnly}
      footprint={footprint}
      defaultOpen={defaultOpen}
    />
  );
}

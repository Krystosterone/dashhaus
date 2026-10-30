import { useHa__Name__ } from "@dashhaus/core";
import type { Ha__Name__Options } from "@dashhaus/core";
import { __Name__Module } from "../cards/__name__/__Name__Module";
import type { __Name__ModuleProps } from "../cards/__name__/__Name__Module";

export interface Ha__Name__ModuleProps extends Ha__Name__Options, Pick<__Name__ModuleProps, "footprint" | "defaultOpen"> {
  entityId: string;
}

/** A live __label__ module: the useHa__Name__ hook above field's module, with today's history. */
export function Ha__Name__Module({ entityId, footprint, defaultOpen, ...options }: Ha__Name__ModuleProps) {
  const { entity, history__actions__ } = useHa__Name__(entityId, options);
  return (
    <__Name__Module
      entity={entity}
      history={history}
      __liveProps__
      footprint={footprint}
      defaultOpen={defaultOpen}
    />
  );
}

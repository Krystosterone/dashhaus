import { useHa__Name__ } from "../../../ha/hooks/__name__";
import type { Ha__Name__Options } from "../../../ha/hooks/__name__";
import { __Name__Module } from "../cards/__name__/__Name__Module";
import type { __Name__ModuleProps } from "../cards/__name__/__Name__Module";

export interface Ha__Name__ModuleProps extends Ha__Name__Options, Pick<__Name__ModuleProps, "footprint" | "defaultOpen"> {
  entityId: string;
}

/** A live, read-only __label__ module: the useHa__Name__ hook above field's module, today's history for its meter. */
export function Ha__Name__Module({ entityId, footprint, defaultOpen, ...options }: Ha__Name__ModuleProps) {
  const { entity, history } = useHa__Name__(entityId, options);
  return <__Name__Module entity={entity} history={history} footprint={footprint} defaultOpen={defaultOpen} />;
}

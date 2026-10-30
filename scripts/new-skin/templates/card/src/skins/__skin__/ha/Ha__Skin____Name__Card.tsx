import { useHa__Name__ } from "@scope/core";
import type { Ha__Name__Options } from "@scope/core";
import { __Skin____Name__Card } from "../cards/__name__/__Skin____Name__Card";
import type { __Skin____Name__CardProps } from "../cards/__name__/__Skin____Name__Card";

export interface Ha__Skin____Name__CardProps extends Ha__Name__Options, Pick<__Skin____Name__CardProps, "footprint" | "defaultOpen"> { entityId: string }

/** The shared useHa__Name__ hook above __Section__'s presentational Card. */
export function Ha__Skin____Name__Card({ entityId, footprint, defaultOpen, ...options }: Ha__Skin____Name__CardProps) {
  const result = useHa__Name__(entityId, options);
  return <__Skin____Name__Card entity={result.entity} history={result.history}__liveProps__ footprint={footprint} defaultOpen={defaultOpen} />;
}

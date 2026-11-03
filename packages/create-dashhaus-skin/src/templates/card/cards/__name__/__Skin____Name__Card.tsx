import type { ReactNode } from "react";
import type { __Name__Entity__historyType__ } from "@dashhaus/core/entities/__name__/types";
__guardedResultImport__
import { __actionImport____Skin__CardFrame } from "../../shared/ui";
import type { __guardedTypeImport____Skin__Footprint } from "../../shared/ui";
import { Icon__Name__ } from "./icons";
import "./__Skin____Name__Card.css";

export interface __Skin____Name__CardProps {
  entity: __Name__Entity;
__historyProp__
  footprint?: __Skin__Footprint;
  defaultOpen?: boolean;
__actionProps__
}

const stateWords = (state: string) => state.replace(/[_-]+/g, " ");

/** Neutral __Section__ baseline for one __label__ entity. Replace its visual language without changing its domain contract. */
export function __Skin____Name__Card({ entity: e__historyArg__, footprint = "standard", defaultOpen = false__actionArgs__ }: __Skin____Name__CardProps) {
__unavailableConst__
  const summary: ReactNode = __summary__;
  const area = "area" in e && typeof e.area === "string" ? e.area : undefined;
  const lastSeen = "lastSeen" in e && typeof e.lastSeen === "string" ? e.lastSeen : undefined;
__actionsBlock__
__guardedBlock__
__leftOut__
  return (
    <__Skin__CardFrame card="__name__" name={e.name} area={area} state={e.state} summary={summary} icon={<Icon__Name__ />} footprint={footprint}__actionsProp____guardedProp__ defaultOpen={defaultOpen}>
      <dl className="__skin__-__name__-facts">
        <div><dt>State</dt><dd>{stateWords(e.state)}</dd></div>
        <div><dt>Entity</dt><dd>{e.entityId}</dd></div>
        {lastSeen && <div><dt>Last seen</dt><dd>{lastSeen}</dd></div>}
      </dl>
__historyNote__
    </__Skin__CardFrame>
  );
}
